/**
 * Serializes non-cancellable native operations (reminder scheduling).
 *
 * Two failure modes pull against each other:
 * - a native call that never answers must not hold every later reschedule
 *   back for the rest of the night (no reminder updates at all);
 * - an operation the queue moved on from must not wake later and cancel or
 *   overwrite reminders scheduled by its successor.
 *
 * So a slow operation is warned about after `warnAfterMs`, and after
 * `releaseAfterMs` the queue moves on without it. It is then abandoned:
 * `check()` throws from its next step, so it stops before changing anything
 * else (operations call it before each destructive or state-writing step).
 */
export class AbandonedOperation extends Error {
  constructor() {
    super('Reminder operation abandoned after the queue moved on');
  }
}

export type OperationControl = {
  /** Throws AbandonedOperation once the queue has moved on without this operation. */
  check: () => void;
};

export function createSerialOperations(
  warnAfterMs: number,
  warn: () => void,
  releaseAfterMs: number = warnAfterMs * 3,
): (operation: (control: OperationControl) => Promise<void>) => Promise<void> {
  let tail: Promise<void> = Promise.resolve();
  return (operation) => {
    const run = () =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        let abandoned = false;
        const watchdog = setTimeout(warn, warnAfterMs);
        const release = setTimeout(() => {
          abandoned = true;
          settled = true;
          clearTimeout(watchdog);
          resolve();
        }, releaseAfterMs);
        const finish = () => {
          clearTimeout(watchdog);
          clearTimeout(release);
        };
        operation({
          check: () => {
            if (abandoned) throw new AbandonedOperation();
          },
        }).then(
          () => {
            finish();
            if (!settled) resolve();
          },
          (error) => {
            finish();
            // An abandoned operation stopping itself is expected, not a failure.
            if (!settled) reject(error);
          },
        );
      });
    const current = tail.then(run, run);
    // Even a rejected task must not poison later queue entries.
    tail = current.then(() => undefined, () => undefined);
    return current;
  };
}
