/**
 * The background task's re-plan: a rough (cell / Wi-Fi) position is improved
 * before choosing the station, and a plan made in the open app is where the
 * task carries on from (so the lock screen doesn't go back to the old station).
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(),
  task: null as null | ((body: { data?: unknown; error?: unknown }) => Promise<void>),
  currentPosition: vi.fn(),
  planNight: vi.fn<(coordinates: { latitude: number; longitude: number }) => Promise<unknown>>(),
  syncLiveActivity: vi.fn(async (_plan: unknown) => undefined),
  syncWidgets: vi.fn(async (_plan: unknown) => undefined),
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (key: string) => mocks.storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => { mocks.storage.set(key, value); }),
    removeItem: vi.fn(async (key: string) => { mocks.storage.delete(key); }),
    multiRemove: vi.fn(async (keys: string[]) => { keys.forEach((key) => mocks.storage.delete(key)); }),
  },
}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' }, AppState: { currentState: 'background' } }));
vi.mock('expo-task-manager', () => ({
  defineTask: (_name: string, task: typeof mocks.task) => { mocks.task = task; },
  isTaskRegisteredAsync: vi.fn(async () => false),
}));
vi.mock('expo-location', () => ({
  Accuracy: { Low: 2, Balanced: 3 },
  getCurrentPositionAsync: mocks.currentPosition,
  hasStartedLocationUpdatesAsync: vi.fn(async () => false),
  startLocationUpdatesAsync: vi.fn(async () => undefined),
  stopLocationUpdatesAsync: vi.fn(async () => undefined),
}));
vi.mock('@/lib/planner', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/planner')>()), planNight: mocks.planNight }));
vi.mock('@/lib/liveActivity', () => ({ syncLiveActivity: mocks.syncLiveActivity, endLiveActivity: vi.fn(async () => undefined) }));
vi.mock('@/lib/widgets', () => ({ syncWidgets: mocks.syncWidgets }));
vi.mock('@/lib/notifications', () => ({
  scheduleReminders: vi.fn(async () => undefined),
  cancelAllReminders: vi.fn(async () => undefined),
  notifyLockFallback: vi.fn(async () => undefined),
  notifyStationSuggestion: vi.fn(async () => undefined),
}));
vi.mock('@/lib/groupSharing', () => ({ syncSharedLeaveBy: vi.fn(async () => undefined) }));
vi.mock('@/lib/enterpriseParticipation', () => ({ syncEnterpriseLeaveBy: vi.fn(async () => undefined) }));

import type { NightPlan } from '@/lib/planner';
import { shareForegroundPlan, readTrackingSnapshot } from '@/lib/tracking';
import { MINUTE_MS } from '@/lib/time';

const NOW = Date.now();
const home = { name: 'Kikuna', nameJa: '菊名', latitude: 35.51, longitude: 139.63 };
const station = (name: string, nameJa: string) => ({ name, nameJa, latitude: 35.7, longitude: 139.7 });
const here = { latitude: 35.7, longitude: 139.7 };

function plan(at: ReturnType<typeof station>, computedAt: number, coordinates = here): NightPlan {
  const choice = {
    station: at, destination: home, walkingMinutes: 8, distanceMeters: 640, walkingSource: 'routed' as const,
    lastTrain: { departsAt: NOW + 120 * MINUTE_MS, source: 'live' as const },
    leaveByMs: NOW + 109 * MINUTE_MS, recommendedLeaveByMs: NOW + 104 * MINUTE_MS, safetyMarginMinutes: 5,
  };
  return { ...choice, coordinates, alternatives: [], autoPick: choice, pinned: false, computedAt };
}

const SNAPSHOT_KEY = 'lastride-tracking-snapshot';
const update = (coords: { latitude: number; longitude: number; accuracy: number }) => mocks.task!({ data: { locations: [{ coords }] } });

beforeEach(() => {
  mocks.storage.clear();
  mocks.storage.set('lastride-tracking-active', 'true');
  mocks.storage.set('lastride-home-station', JSON.stringify(home));
  mocks.currentPosition.mockReset();
  mocks.planNight.mockReset();
  mocks.syncLiveActivity.mockClear();
  mocks.syncWidgets.mockClear();
});

describe('a rough background position', () => {
  test('is improved once before the re-plan chooses a station', async () => {
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - 20 * MINUTE_MS)));
    mocks.currentPosition.mockResolvedValue({ coords: { latitude: 35.712, longitude: 139.704, accuracy: 35 } });
    mocks.planNight.mockImplementation(async (coordinates) => plan(station('Takadanobaba', '高田馬場'), Date.now(), coordinates));
    await update({ latitude: 35.705, longitude: 139.71, accuracy: 1000 });
    expect(mocks.currentPosition).toHaveBeenCalledOnce();
    expect(mocks.planNight.mock.calls[0][0]).toEqual({ latitude: 35.712, longitude: 139.704 });
  });

  test('a precise one is used as it is; with no better fix, the rough one stands', async () => {
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - 20 * MINUTE_MS)));
    mocks.planNight.mockImplementation(async (coordinates) => plan(station('Nishi-Waseda', '西早稲田'), Date.now(), coordinates));
    await update({ latitude: 35.705, longitude: 139.71, accuracy: 65 });
    expect(mocks.currentPosition).not.toHaveBeenCalled();
    mocks.currentPosition.mockRejectedValue(new Error('no fix'));
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - 20 * MINUTE_MS)));
    await update({ latitude: 35.705, longitude: 139.71, accuracy: 1000 });
    expect(mocks.planNight.mock.calls[1][0]).toEqual({ latitude: 35.705, longitude: 139.71 });
  });
});

describe('a plan made in the open app', () => {
  test('becomes the task’s plan: its next update keeps the new station on the lock screen', async () => {
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - 5 * MINUTE_MS)));
    await shareForegroundPlan(plan(station('Takadanobaba', '高田馬場'), NOW - MINUTE_MS));
    expect((await readTrackingSnapshot())?.station.nameJa).toBe('高田馬場');
    // Barely moved, a minute later: no re-plan, the Live Activity is brought up to date from it.
    await update({ latitude: 35.7001, longitude: 139.7001, accuracy: 30 });
    expect(mocks.planNight).not.toHaveBeenCalled();
    expect(mocks.syncLiveActivity.mock.calls.at(-1)?.[0]).toMatchObject({ station: { nameJa: '高田馬場' } });
  });

  test('never replaces a newer plan from the task, and not once tracking is off', async () => {
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Takadanobaba', '高田馬場'), NOW)));
    await shareForegroundPlan(plan(station('Nishi-Waseda', '西早稲田'), NOW - MINUTE_MS));
    expect((await readTrackingSnapshot())?.station.nameJa).toBe('高田馬場');
    mocks.storage.delete('lastride-tracking-active');
    mocks.storage.delete(SNAPSHOT_KEY);
    await shareForegroundPlan(plan(station('Nishi-Waseda', '西早稲田'), NOW));
    expect(await readTrackingSnapshot()).toBeNull();
  });
});

describe('an earlier 〔乗った〕 answer', () => {
  const night = (ms: number) => {
    const japan = new Date(ms + 9 * 3600_000 - 4 * 3600_000);
    return `${japan.getUTCFullYear()}${String(japan.getUTCMonth() + 1).padStart(2, '0')}${String(japan.getUTCDate()).padStart(2, '0')}`;
  };

  test('for a train before tracking started: ignored, the new session carries on', async () => {
    mocks.storage.set('lastride-tracking-started-at', String(NOW - 10 * MINUTE_MS));
    mocks.storage.set('lastride-boarded', JSON.stringify({ night: night(NOW), choice: 1, trainDepartsAt: NOW - 60 * MINUTE_MS }));
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - MINUTE_MS)));
    await update({ latitude: 35.7001, longitude: 139.7001, accuracy: 30 });
    expect(mocks.storage.get('lastride-tracking-active')).toBe('true');
    expect(mocks.syncLiveActivity).toHaveBeenCalled();
  });

  test('for a train after tracking started: the night is over, tracking stops', async () => {
    mocks.storage.set('lastride-tracking-started-at', String(NOW - 60 * MINUTE_MS));
    mocks.storage.set('lastride-boarded', JSON.stringify({ night: night(NOW), choice: 1, trainDepartsAt: NOW - 5 * MINUTE_MS }));
    mocks.storage.set(SNAPSHOT_KEY, JSON.stringify(plan(station('Nishi-Waseda', '西早稲田'), NOW - MINUTE_MS)));
    await update({ latitude: 35.7001, longitude: 139.7001, accuracy: 30 });
    expect(mocks.syncLiveActivity).not.toHaveBeenCalled();
    expect(mocks.storage.has(SNAPSHOT_KEY)).toBe(false);
  });
});
