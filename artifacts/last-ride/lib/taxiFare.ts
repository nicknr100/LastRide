/** Taxi fares, estimated from the distance driven (the If missed screen, the far-station card). */
import { formatJstTime } from '@/lib/time';

/** 22:00–05:00: the late-night surcharge applies. */
export function isLateNight(nowMs: number) {
  const hour = Number(formatJstTime(nowMs).slice(0, 2));
  return hour >= 22 || hour < 5;
}

/** Tokyo-area meter (¥500 first 1.096 km, ¥100 per 255 m), +20% late at night. Kept in step with the server's estimate. */
export function estimateTaxiFare(distanceMeters: number, lateNight: boolean) {
  const metered =
    500 + Math.ceil(Math.max(0, distanceMeters - 1096) / 255) * 100;
  return Math.round(lateNight ? metered * 1.2 : metered);
}
