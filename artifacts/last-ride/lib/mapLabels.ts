/**
 * Where the map card's labels go (components/MapCard): kept inside the map,
 * off the bottom strip, and off the marks they'd otherwise cover.
 */

/** Labels keep at least this far from the map's edges. */
export const EDGE = 4;
/** The bottom strip holds the Apple Maps logo, 法的情報 and the open-in-Maps button: no labels there. */
export const BOTTOM_RESERVED = 40;
/** A small label's height (徒歩◯分, a place's name). */
export const PIN_LABEL_HEIGHT = 20;

export function clampTop(top: number, height: number, frameHeight: number): number {
  return Math.max(EDGE, Math.min(top, frameHeight - height - BOTTOM_RESERVED));
}

export type Box = { left: number; top: number; right: number; bottom: number };
export const STATION_TAG_HEIGHT = 22;

export const around = ({ x, y }: { x: number; y: number }, half: number): Box => ({ left: x - half, top: y - half, right: x + half, bottom: y + half });
export const overlapsAny = (box: Box, others: Box[]) =>
  others.some((other) => box.left < other.right + 2 && box.right > other.left - 2 && box.top < other.bottom + 2 && box.bottom > other.top - 2);

/**
 * Where 徒歩◯分 goes: beside the walk's middle (right of the line, else left,
 * above or below), then farther along it, the first spot inside the map that
 * covers neither your marker nor the station's dot or name. On a short walk
 * those crowd the middle, so it can end up a little away from the line;
 * with no free spot, the middle as before.
 */
export function placeWalkLabel(line: Array<{ x: number; y: number }>, width: number, frame: { width: number; height: number }, marks: Box[]): { left: number; top: number } {
  const h = PIN_LABEL_HEIGHT;
  if (line.length === 0) return { left: 10, top: 10 };
  const at = (fraction: number) => line[Math.min(line.length - 1, Math.floor(line.length * fraction))];
  const fits = ({ left, top }: { left: number; top: number }) =>
    left >= EDGE && left + width <= frame.width - EDGE && top >= EDGE && top + h <= frame.height - BOTTOM_RESERVED;
  const spots = [0.5, 0.35, 0.65, 0.2, 0.8].flatMap((fraction) => {
    const { x, y } = at(fraction);
    return [
      { left: x + 10, top: y - h / 2 },
      { left: x - 10 - width, top: y - h / 2 },
      { left: x - width / 2, top: y - 12 - h },
      { left: x - width / 2, top: y + 12 },
    ];
  });
  // Farther out from the middle, for a walk so short everything sits together.
  const { x, y } = at(0.5);
  spots.push(
    { left: x + 24, top: y - h / 2 }, { left: x - 24 - width, top: y - h / 2 },
    { left: x - width / 2, top: y - 30 - h }, { left: x - width / 2, top: y + 30 },
  );
  const free = spots.find((spot) => fits(spot) && !overlapsAny({ ...spot, right: spot.left + width, bottom: spot.top + h }, marks));
  if (free) return free;
  const right = x + 10;
  return { left: right + width + EDGE <= frame.width ? right : Math.max(EDGE, x - 10 - width), top: clampTop(y - h / 2, h, frame.height) };
}
