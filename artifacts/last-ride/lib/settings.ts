/**
 * Persisted user settings. Shared by the React app and the headless
 * background-location task, which runs in a separate JS runtime.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StationOption, WalkingSpeed } from '@/lib/stations';
import { serviceDate } from '@/lib/time';

export type Language = 'ja' | 'en';

export const STORAGE_KEYS = {
  language: 'lastride-language',
  homeStation: 'lastride-home-station',
  walkingSpeed: 'lastride-walking-speed',
  reminders: 'lastride-reminder-intervals',
  pinnedStation: 'lastride-pinned-station',
} as const;

export const REMINDER_CHOICES = [30, 15, 10, 5];
export const DEFAULT_REMINDERS = [15];

export type Settings = {
  language: Language | null;
  homeStation: StationOption | null;
  walkingSpeed: WalkingSpeed;
  reminderIntervals: number[];
  /** Station the user chose over the automatic pick; valid for one night only. */
  pinnedStation: StationOption | null;
};

export const DEFAULT_SETTINGS: Settings = {
  language: null,
  homeStation: null,
  walkingSpeed: 'normal',
  reminderIntervals: DEFAULT_REMINDERS,
  pinnedStation: null,
};

function parseHomeStation(raw: string | null): StationOption | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StationOption;
    return parsed && typeof parsed === 'object' && parsed.name ? parsed : null;
  } catch {
    // Legacy value was a plain station name typed by the user (no coordinates).
    return { name: raw, nameJa: raw, latitude: 0, longitude: 0 };
  }
}

function parseReminders(raw: string | null): number[] {
  if (!raw) return DEFAULT_REMINDERS;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is number => REMINDER_CHOICES.includes(entry as number)) : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

/** A pin only applies to the service day it was made on, so it never leaks into tomorrow night. */
function parsePinnedStation(raw: string | null): StationOption | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { station?: StationOption; serviceDate?: string };
    return parsed.station && parsed.serviceDate === serviceDate(Date.now()) ? parsed.station : null;
  } catch {
    return null;
  }
}

export async function writePinnedStation(station: StationOption | null): Promise<void> {
  if (station) await AsyncStorage.setItem(STORAGE_KEYS.pinnedStation, JSON.stringify({ station, serviceDate: serviceDate(Date.now()) }));
  else await AsyncStorage.removeItem(STORAGE_KEYS.pinnedStation);
}

export async function readSettings(): Promise<Settings> {
  const [language, homeStation, walkingSpeed, reminders, pinnedStation] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.language),
    AsyncStorage.getItem(STORAGE_KEYS.homeStation),
    AsyncStorage.getItem(STORAGE_KEYS.walkingSpeed),
    AsyncStorage.getItem(STORAGE_KEYS.reminders),
    AsyncStorage.getItem(STORAGE_KEYS.pinnedStation),
  ]);
  return {
    language: language === 'ja' || language === 'en' ? language : null,
    homeStation: parseHomeStation(homeStation),
    walkingSpeed: walkingSpeed === 'relaxed' || walkingSpeed === 'fast' ? walkingSpeed : 'normal',
    reminderIntervals: parseReminders(reminders),
    pinnedStation: parsePinnedStation(pinnedStation),
  };
}

/** True when the station has real coordinates (legacy typed-in names do not). */
export function hasCoordinates(station: StationOption | null): station is StationOption {
  return !!station && (station.latitude !== 0 || station.longitude !== 0);
}
