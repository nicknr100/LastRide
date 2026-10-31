/** The nearest station beyond walking reach: a believable drive, and when to set off by car. */
import { describe, expect, test } from 'vitest';
import { believableDrive, leaveByCar } from '@/lib/farStation';
import { estimateTaxiFare } from '@/lib/taxiFare';
import { MINUTE_MS } from '@/lib/time';

const jst = (hours: number, minutes = 0) => Date.UTC(2026, 9, 31, hours - 9, minutes);

describe('far station', () => {
  test('Apple’s drive only when it fits the distance (a mountain spot starts from a far road)', () => {
    expect(believableDrive({ minutes: 17, distanceMeters: 12_000 }, 8_800)).toEqual({ minutes: 17, distanceMeters: 12_000 });
    expect(believableDrive({ minutes: 126, distanceMeters: 84_300 }, 9_800)).toBeNull();
    expect(believableDrive(null, 9_800)).toBeNull();
  });

  test('leave by car: the train, less the drive and the minutes at the station', () => {
    const train = { departsAt: jst(21, 37), source: 'apple' as const };
    expect(leaveByCar(train, { minutes: 17, distanceMeters: 12_000 }, jst(21, 0))).toBe(jst(21, 17));
    // No drive known, or the train already gone: nothing to say.
    expect(leaveByCar(train, null, jst(21, 0))).toBeNull();
    expect(leaveByCar(train, { minutes: 17, distanceMeters: 12_000 }, jst(21, 40))).toBeNull();
    expect(leaveByCar(null, { minutes: 17, distanceMeters: 12_000 }, jst(21, 0))).toBeNull();
  });

  test('taxi fare from the drive, with the late-night surcharge', () => {
    expect(estimateTaxiFare(12_000, false)).toBe(500 + Math.ceil((12_000 - 1096) / 255) * 100);
    expect(estimateTaxiFare(12_000, true)).toBe(Math.round(estimateTaxiFare(12_000, false) * 1.2));
    expect(MINUTE_MS).toBe(60_000);
  });
});
