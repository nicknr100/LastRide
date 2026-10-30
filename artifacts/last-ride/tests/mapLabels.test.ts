/** 徒歩◯分 on the map card: beside the walk, never over your marker or the station. */
import { describe, expect, test } from 'vitest';
import { around, BOTTOM_RESERVED, EDGE, overlapsAny, PIN_LABEL_HEIGHT, placeWalkLabel, type Box } from '@/lib/mapLabels';

const frame = { width: 340, height: 200 };
const WIDTH = 60;
const box = ({ left, top }: { left: number; top: number }): Box => ({ left, top, right: left + WIDTH, bottom: top + PIN_LABEL_HEIGHT });
const inside = (spot: { left: number; top: number }) =>
  spot.left >= EDGE && spot.left + WIDTH <= frame.width - EDGE && spot.top >= EDGE && spot.top + PIN_LABEL_HEIGHT <= frame.height - BOTTOM_RESERVED;
const straight = (from: { x: number; y: number }, to: { x: number; y: number }, steps = 10) =>
  Array.from({ length: steps + 1 }, (_, index) => ({ x: from.x + ((to.x - from.x) * index) / steps, y: from.y + ((to.y - from.y) * index) / steps }));

describe('the walk label', () => {
  test('a long walk: just right of the line’s middle, as before', () => {
    const line = straight({ x: 60, y: 40 }, { x: 60, y: 140 });
    expect(placeWalkLabel(line, WIDTH, frame, [around(line[0], 14), around(line[10], 8)])).toEqual({ left: 70, top: 80 });
  });

  test('a short walk whose middle is under your marker: moved off it, still inside the map', () => {
    const you = { x: 170, y: 80 };
    const line = straight(you, { x: 190, y: 86 }, 4);
    const marks = [around(you, 14), around(line[4], 8), { left: 160, top: 52, right: 230, bottom: 74 }];
    const spot = placeWalkLabel(line, WIDTH, frame, marks);
    expect(overlapsAny(box(spot), marks)).toBe(false);
    expect(inside(spot)).toBe(true);
  });

  test('near the right edge it goes left of the line; never into the bottom strip', () => {
    const line = straight({ x: 320, y: 40 }, { x: 320, y: 150 });
    const spot = placeWalkLabel(line, WIDTH, frame, []);
    expect(spot.left + WIDTH).toBeLessThanOrEqual(310);
    expect(inside(spot)).toBe(true);
  });
});
