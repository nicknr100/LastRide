/**
 * A short on-device record of Live Activity and tracking events (start,
 * update, end and why), for chasing problems that only happen on a phone:
 * release builds don't send JavaScript logs to the system log. Read in the
 * TestFlight test tools (Settings). Kept on the phone, last 40 entries only;
 * recorded on TestFlight and development builds only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

/** Only TestFlight and development builds keep the record: App Store users never write it. */
let recording: boolean | null = null;
function isRecording(): boolean {
  if (recording !== null) return recording;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return (recording = true);
  try {
    // Loaded here, not at the top: the native module isn't there in Node tests.
    recording = (require('@/modules/last-ride-alarm/src') as typeof import('@/modules/last-ride-alarm/src')).isTestFlightBuild;
  } catch {
    recording = false;
  }
  return recording;
}

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
  if (!isRecording()) return Promise.resolve();
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
