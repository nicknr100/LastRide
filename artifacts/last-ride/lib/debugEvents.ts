/**
 * A short on-device record of Live Activity and tracking events (start,
 * update, end and why), for chasing problems that only happen on a phone:
 * release builds don't send JavaScript logs to the system log. Read in the
 * TestFlight test tools (Settings). Kept on the phone, last 40 entries only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

const KEY = 'lastride-debug-events';
const LIMIT = 40;
let chain: Promise<void> = Promise.resolve();

function stamp(ms: number): string {
  const japan = new Date(ms + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(japan.getUTCHours())}:${pad(japan.getUTCMinutes())}:${pad(japan.getUTCSeconds())}`;
}

/**
 * Records `message` with the time and whether the app is in front. Never throws.
 * Await it before something that could get the app suspended (ending the Live
 * Activity in the background), so the line is saved first.
 */
export function debugEvent(message: string): Promise<void> {
  const line = `${stamp(Date.now())} [${AppState.currentState}] ${message}`;
  chain = chain
    .then(async () => {
      const raw = await AsyncStorage.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as string[]) : [];
      list.push(line);
      await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-LIMIT)));
    })
    .catch(() => undefined);
  return chain;
}

export async function readDebugEvents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export async function clearDebugEvents(): Promise<void> {
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}
