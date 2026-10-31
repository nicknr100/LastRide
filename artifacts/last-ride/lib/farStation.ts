/**
 * No station within walking reach (5 km): the nearest one anyway, as a way home
 * for someone who can get there by taxi, bus or car. Its last train home, the
 * latest time to set off by car, the taxi fare there and the closest taxi
 * stand. Shown on the main screen; never planned as a walk or tracked.
 */
import { appleNearbyTaxiStands, appleNearestStationByCar, appleTaxiCompanies, type FarStation, type TaxiCompany, type TaxiStand } from '@/lib/applePlaces';
import { firstTrainSearchFrom, STATION_BUFFER_MINUTES } from '@/lib/planner';
import { distanceBetween, type Coordinates, type StationOption } from '@/lib/stations';
import { resolveStation } from '@/lib/storedPlaces';
import { estimateTaxiFare, isLateNight } from '@/lib/taxiFare';
import { getFirstTrain, getLastTrain, type TrainTime } from '@/lib/timetable';
import { searchLastTrain, stationNames } from '@/lib/appleTransit';
import { AppleMaps } from '@/modules/apple-maps/src';
import { appleDrivingEta, appleNearbyStays, type AppleStay } from '@/lib/applePlaces';
import { MINUTE_MS } from '@/lib/time';

/** A taxi stand this close is worth walking to; farther, a ride-hailing app is the way. */
const TAXI_STAND_METERS = 1500;

export type FarStationPlan = FarStation & {
  /** Apple's drive, when it is a believable one (see believableDrive). */
  drive: FarStation['drive'];
  /** Tonight's last train home from it, also once it has left (shown as 出発済み); null when there is none. */
  lastTrain: TrainTime | null;
  /** Leave here by this to make it by car: the drive, plus the usual minutes at the station. */
  leaveByCarMs: number | null;
  /** Taxi fare there, from the drive. */
  taxiFareYen: number | null;
  /** The closest taxi stand within 1.5 km. */
  taxiStand: TaxiStand | null;
  /** With no stand that close: local taxi companies to call, within 20 km. */
  taxiCompanies: TaxiCompany[];
};

/**
 * Apple's driving route only when it fits the distance: from a spot far off any
 * road (a mountain) it starts from a distant road and can be ten times as long.
 */
export function believableDrive(drive: FarStation['drive'], straightMeters: number): FarStation['drive'] {
  return drive && drive.distanceMeters <= straightMeters * 2.5 ? drive : null;
}

export function leaveByCar(lastTrain: TrainTime | null, drive: FarStation['drive'], nowMs: number): number | null {
  if (!lastTrain || !drive || lastTrain.departsAt <= nowMs) return null;
  return lastTrain.departsAt - (drive.minutes + STATION_BUFFER_MINUTES) * MINUTE_MS;
}

export async function planFarStation(coordinates: Coordinates, home: StationOption, nowMs: number): Promise<FarStationPlan | null> {
  const nearest = await appleNearestStationByCar(coordinates);
  if (!nearest) return null;
  const drive = believableDrive(nearest.drive, nearest.straightMeters);
  // Saved places are stored by name: find the home station's position first (as planNight does).
  const destination = await resolveStation(home).catch(() => home);
  const [found, stands] = await Promise.all([
    getLastTrain(nearest.station, destination, nowMs).catch(() => null),
    appleNearbyTaxiStands(coordinates, TAXI_STAND_METERS, 1).catch(() => null),
  ]);
  const lastTrain = found;
  const taxiStand = stands?.[0] ?? null;
  // Only asked when there's no stand to walk to: one Apple search fewer in town.
  const taxiCompanies = taxiStand ? [] : ((await appleTaxiCompanies(coordinates).catch(() => null)) ?? []);
  return {
    ...nearest,
    drive,
    lastTrain,
    leaveByCarMs: leaveByCar(lastTrain, drive, nowMs),
    taxiFareYen: drive ? estimateTaxiFare(drive.distanceMeters, isLateNight(nowMs)) : null,
    taxiStand,
    taxiCompanies,
  };
}

export type Trip = { departsAt: number; arrivesAt?: number; approximate?: boolean };

/**
 * Public transport home from right here, buses included (Apple plans the whole
 * trip): tonight's last trip, and the next one leaving. `departsAt` is when to
 * leave here (the walk to the stop included). With nothing more tonight,
 * `next` is the first trip tomorrow. Asked only on the ways-home screen: the
 * last-trip search takes several MapKit questions.
 */
export async function transitHomeFrom(coordinates: Coordinates, home: StationOption, nowMs: number): Promise<{ last: Trip | null; next: Trip | null } | null> {
  const maps = AppleMaps;
  if (!maps) return null;
  const destination = await resolveStation(home).catch(() => home);
  const to = { latitude: destination.latitude, longitude: destination.longitude, stationNames: stationNames(destination) };
  const query = (when: { arriveBy?: number; departAt?: number }) => maps.transitEta({ from: coordinates, to, ...when });
  const [last, next] = await Promise.all([
    searchLastTrain(query, nowMs).catch(() => null),
    query({ departAt: nowMs }).then((eta) => ({ departsAt: eta.departureMs, arrivesAt: eta.arrivalMs })).catch(() => null),
  ]);
  return { last, next };
}

/** Taxi all the way home: Apple's drive and the fare. */
export async function taxiHomeFrom(coordinates: Coordinates, home: StationOption, nowMs: number): Promise<{ minutes: number; distanceMeters: number; fareYen: number; to: Coordinates } | null> {
  const destination = await resolveStation(home).catch(() => home);
  const drive = await appleDrivingEta(coordinates, destination).catch(() => null);
  return drive ? { ...drive, fareYen: estimateTaxiFare(drive.distanceMeters, isLateNight(nowMs)), to: { latitude: destination.latitude, longitude: destination.longitude } } : null;
}

/** The morning's first train home from the nearest station (after tonight's last one). */
export async function firstTrainFrom(far: FarStationPlan, home: StationOption, nowMs: number): Promise<TrainTime | null> {
  const destination = await resolveStation(home).catch(() => home);
  const from = far.lastTrain ? firstTrainSearchFrom(far.lastTrain.departsAt, nowMs) : nowMs;
  return getFirstTrain(far.station, destination, from).catch(() => null);
}

/** Within this walk of the station: somewhere to wait for its first train. */
const STAY_NEAR_STATION_METERS = 1500;

export type StayNearStation = AppleStay & { metersFromStation: number };

/**
 * Places to wait until morning near the nearest station, not near the user: in
 * the countryside there's nothing within walking reach, and a taxi to the
 * station's area leaves the user at its first train. Nearest first.
 */
export async function staysNearStation(far: FarStationPlan, limit = 5): Promise<StayNearStation[] | null> {
  const stays = await appleNearbyStays(far.station, STAY_NEAR_STATION_METERS).catch(() => null);
  if (!stays) return null;
  const seen = new Set<string>();
  return stays
    .map((stay) => ({ ...stay, metersFromStation: distanceBetween(far.station, stay) }))
    .sort((first, second) => first.metersFromStation - second.metersFromStation)
    .filter((stay) => {
      if (seen.has(stay.name)) return false;
      seen.add(stay.name);
      return true;
    })
    .slice(0, limit);
}
