/**
 * Where the LastRide API server lives. Imported for its side effect by modules
 * that call the server, so both the app and the headless background task are
 * configured.
 */
import { setBaseUrl } from '@workspace/api-client-react';
import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const API_PORT = 8080;

/** Host of the machine running Metro — the API server runs next to it in development. */
function devMachineHost(): string | null {
  if (Platform.OS === 'web') return typeof window !== 'undefined' ? window.location.hostname : null;
  // The URL this JS bundle was loaded from, e.g. http://192.168.0.12:8081/index.bundle?…
  // Present in every debug build (Expo Go, dev client, `expo run:ios`), unlike `hostUri`.
  const sourceCode = NativeModules.SourceCode as { scriptURL?: string; getConstants?: () => { scriptURL?: string } } | undefined;
  const scriptURL = sourceCode?.getConstants?.().scriptURL ?? sourceCode?.scriptURL;
  const fromBundle = scriptURL?.match(/^https?:\/\/([^/:]+)/)?.[1];
  return fromBundle ?? Constants.expoConfig?.hostUri?.split(':')[0] ?? null;
}

function resolveApiBaseUrl(): string | null {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured;
  if (!__DEV__) return null;
  const host = devMachineHost();
  return host ? `http://${host}:${API_PORT}` : null;
}

export const apiBaseUrl = resolveApiBaseUrl();
setBaseUrl(apiBaseUrl);

if (__DEV__) console.log(`[LastRide] API server: ${apiBaseUrl ?? 'none — using sample train times'}`);
