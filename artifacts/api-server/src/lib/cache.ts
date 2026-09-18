import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger";

/** Where caches and usage counts are saved, so a server restart doesn't re-spend API calls. */
export const DATA_DIR = process.env["CACHE_DIR"] ?? path.resolve(process.cwd(), ".cache");
const SAVE_DELAY_MS = 2000;

/** Reads a JSON file from the data directory, or undefined if it is missing or unreadable. */
export function readDataFile<T>(name: string): T | undefined {
  try {
    return JSON.parse(readFileSync(path.join(DATA_DIR, `${name}.json`), "utf8")) as T;
  } catch {
    return undefined;
  }
}

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

/** Writes a JSON file to the data directory, batching rapid successive writes. */
export function writeDataFileSoon(name: string, getData: () => unknown) {
  if (pendingSaves.has(name)) return;
  pendingSaves.set(
    name,
    setTimeout(() => {
      pendingSaves.delete(name);
      try {
        mkdirSync(DATA_DIR, { recursive: true });
        writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(getData()));
      } catch (err) {
        logger.warn({ err, name }, "Could not save cache file");
      }
    }, SAVE_DELAY_MS).unref(),
  );
}

type Entry<T> = { value: T; expiresAt: number };

/**
 * In-memory cache with a fixed time-to-live. Given a name, it is also saved to
 * disk and reloaded on startup.
 */
export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(
    private ttlMs: number,
    private name?: string,
  ) {
    if (!name) return;
    const saved = readDataFile<Array<[string, Entry<T>]>>(`cache-${name}`) ?? [];
    const now = Date.now();
    for (const [key, entry] of saved) {
      if (entry.expiresAt > now) this.entries.set(key, entry);
    }
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry || entry.expiresAt < Date.now()) return undefined;
    return entry.value;
  }

  set(key: string, value: T) {
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    if (this.name) {
      writeDataFileSoon(`cache-${this.name}`, () => {
        const now = Date.now();
        return [...this.entries].filter(([, entry]) => entry.expiresAt > now);
      });
    }
  }
}

/** Thrown when an upstream data provider is unreachable or misconfigured. */
export class ProviderError extends Error {}
