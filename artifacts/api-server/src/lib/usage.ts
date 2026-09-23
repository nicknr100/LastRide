/**
 * Counts real (uncached) calls to paid providers, per Japan-time day and month,
 * so API spend during testing is visible rather than guessed.
 */
import { readDataFile, writeDataFileSoon } from "./cache";
import { logger } from "./logger";

export type Provider = "ekispert" | "navitime-transport" | "navitime-route-car" | "navitime-route-walk" | "navitime-spot" | "navitime-geocoding";

/** Free-plan monthly allowances; RapidAPI Basic plans stop at 500 calls a month per API. */
export const MONTHLY_LIMITS: Partial<Record<Provider, number>> = {
  "navitime-transport": 500,
  "navitime-route-car": 500,
  "navitime-route-walk": 500,
  "navitime-spot": 500,
  "navitime-geocoding": 500,
};

type Counts = Record<string, number>;
type UsageFile = { daily: Record<string, Counts>; monthly: Record<string, Counts> };

const usage: UsageFile = readDataFile<UsageFile>("usage") ?? { daily: {}, monthly: {} };

function jstDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function recordCall(provider: Provider, endpoint: string) {
  const day = jstDate();
  const month = day.slice(0, 7);
  const daily = (usage.daily[day] ??= {});
  const monthly = (usage.monthly[month] ??= {});
  daily[provider] = (daily[provider] ?? 0) + 1;
  monthly[provider] = (monthly[provider] ?? 0) + 1;
  const limit = MONTHLY_LIMITS[provider];
  logger.info({ provider, endpoint, today: daily[provider], thisMonth: monthly[provider], monthlyLimit: limit }, "Paid API call");
  if (limit && monthly[provider] === Math.floor(limit * 0.8)) {
    logger.warn({ provider, thisMonth: monthly[provider], monthlyLimit: limit }, "80% of monthly free calls used");
  }
  writeDataFileSoon("usage", () => usage);
}

export function usageReport() {
  const day = jstDate();
  const month = day.slice(0, 7);
  return {
    date: day,
    month,
    today: usage.daily[day] ?? {},
    thisMonth: usage.monthly[month] ?? {},
    monthlyLimits: MONTHLY_LIMITS,
  };
}
