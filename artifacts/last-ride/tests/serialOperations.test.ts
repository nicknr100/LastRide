import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSerialOperations } from '@/lib/serialOperations';

afterEach(() => {
  vi.useRealTimers();
});

describe('non-cancellable reminder operations', () => {
  it('does not warn after work has already completed', async () => {
    vi.useFakeTimers();
    const warning = vi.fn();
    const enqueue = createSerialOperations(20_000, warning);
    await enqueue(async () => undefined);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(40_000);
    expect(warning).not.toHaveBeenCalled();
  });

  it('does not let new work start at the warning', async () => {
    vi.useFakeTimers();
    const warning = vi.fn();
    const enqueue = createSerialOperations(20_000, warning, 60_000);
    const events: string[] = [];
    let unblock!: () => void;
    const pending = new Promise<void>((resolve) => { unblock = resolve; });
    const old = enqueue(async () => {
      events.push('old-start');
      await pending;
      events.push('old-end');
    });
    const newer = enqueue(async () => {
      events.push('new-start');
    });
    await vi.advanceTimersByTimeAsync(20_001);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(events).toEqual(['old-start']);
    unblock();
    await Promise.all([old, newer]);
    expect(events).toEqual(['old-start', 'old-end', 'new-start']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('moves on from a native call that never answers, and the abandoned one changes nothing after', async () => {
    vi.useFakeTimers();
    const enqueue = createSerialOperations(20_000, vi.fn(), 60_000);
    const events: string[] = [];
    let unblock!: () => void;
    const hung = new Promise<void>((resolve) => { unblock = resolve; });
    const old = enqueue(async (control) => {
      events.push('old-start');
      await hung;
      control.check();
      events.push('old-overwrites'); // must never happen
    });
    const newer = enqueue(async (control) => {
      control.check();
      events.push('new-schedule');
    });
    await vi.advanceTimersByTimeAsync(60_001);
    await Promise.all([old, newer]);
    expect(events).toEqual(['old-start', 'new-schedule']);
    // The stuck call finally answers: the old operation stops at its check.
    unblock();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['old-start', 'new-schedule']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears a failed operation watchdog and continues to the next operation', async () => {
    vi.useFakeTimers();
    const warning = vi.fn();
    const enqueue = createSerialOperations(20_000, warning);
    const seen: string[] = [];
    await expect(enqueue(async () => { throw new Error('native failure'); }))
      .rejects.toThrow('native failure');
    await enqueue(async () => { seen.push('recovered'); });
    expect(seen).toEqual(['recovered']);
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(warning).not.toHaveBeenCalled();
  });

  it('always serializes concurrent submissions with asynchronous native work', async () => {
    const enqueue = createSerialOperations(60_000, vi.fn());
    let active = 0;
    let peak = 0;
    await Promise.all(Array.from({ length: 25 }, () => enqueue(async () => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
    })));
    expect(peak).toBe(1);
  });
});
