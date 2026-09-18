import { BottomNav } from '@/components/BottomNav';
import { RailwayMark } from '@/components/RideUI';
import { useLastRide } from '@/context/LastRideContext';
import { distanceBetween, overpassQuery } from '@/lib/stations';
import { apiBaseUrl } from '@/lib/api';
import { formatDuration, formatJstDateTime, formatJstTime } from '@/lib/time';
import { getNearbyPlaces, getTaxiEstimate } from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StayOption = {
  name: string;
  kind: 'net-cafe' | 'karaoke' | 'capsule' | 'hotel';
  latitude: number;
  longitude: number;
  walkMinutes: number;
  phone?: string;
  open24h?: boolean;
};

type TaxiEstimate = { fareYen: number; durationMinutes: number; distanceKm: number; lateNight: boolean };

function formatYen(amount: number) {
  return `¥${Math.round(amount).toLocaleString('en-US')}`;
}

/** Japanese taxis add a 20% surcharge between 22:00 and 05:00. */
function isLateNight(nowMs: number) {
  const hour = Number(formatJstTime(nowMs).slice(0, 2));
  return hour >= 22 || hour < 5;
}

/** Fallback when the API server is unavailable: Tokyo-area meter (¥500 first 1.096 km, ¥100 per 255 m). */
function estimateTaxiFare(distanceMeters: number, lateNight: boolean) {
  const base = 500;
  const extraMeters = Math.max(0, distanceMeters - 1096);
  const metered = base + Math.ceil(extraMeters / 255) * 100;
  return lateNight ? metered * 1.2 : metered;
}

/** Typical overnight prices in Tokyo (night packs, late-night free time, a night's stay); hotels vary widely. */
const STAY_COSTS: Record<StayOption['kind'], { from: number; to?: number }> = {
  'net-cafe': { from: 1500, to: 3000 },
  karaoke: { from: 1500, to: 3500 },
  capsule: { from: 3500, to: 6000 },
  hotel: { from: 8000 },
};
const PER_KIND = 2;
const MAX_STAYS = 6;

/** Streets add roughly 30% to the straight-line distance; 80 m per minute is a normal pace. */
function walkMinutesFor(straightMeters: number) {
  return Math.max(1, Math.ceil((straightMeters * 1.3) / 80));
}

/** Up to PER_KIND of each kind, so a hotel district still shows the nearest net café and karaoke. */
function pickStays(options: Array<StayOption & { distance: number }>): StayOption[] {
  const perKind = new Map<StayOption['kind'], number>();
  const seen = new Set<string>();
  return options
    .sort((first, second) => first.distance - second.distance)
    .filter((option) => {
      const count = perKind.get(option.kind) ?? 0;
      if (seen.has(option.name) || count >= PER_KIND) return false;
      seen.add(option.name);
      perKind.set(option.kind, count + 1);
      return true;
    })
    .slice(0, MAX_STAYS);
}

async function fetchNearbyStays(latitude: number, longitude: number): Promise<StayOption[]> {
  if (apiBaseUrl) {
    try {
      const places = await getNearbyPlaces({ lat: latitude, lon: longitude });
      return pickStays(places.map((place) => ({ ...place, distance: place.distanceMeters, walkMinutes: walkMinutesFor(place.distanceMeters) })));
    } catch {
      // Fall back to OpenStreetMap below.
    }
  }
  const query = `[out:json][timeout:15];(node(around:1500,${latitude},${longitude})["amenity"="internet_cafe"];node(around:1500,${latitude},${longitude})["amenity"="karaoke_box"];node(around:1500,${latitude},${longitude})["tourism"~"^(hotel|hostel|guest_house)$"];);out tags center 30;`;
  const elements = await overpassQuery(query);
  const options: Array<StayOption & { distance: number }> = [];
  for (const element of elements) {
    if (element.lat === undefined || element.lon === undefined) continue;
    const tags = element.tags ?? {};
    const name = tags.name ?? tags['name:en'];
    if (!name) continue;
    const kind: StayOption['kind'] = tags.amenity === 'internet_cafe' ? 'net-cafe' : tags.amenity === 'karaoke_box' ? 'karaoke' : 'hotel';
    const distance = distanceBetween({ latitude, longitude }, { latitude: element.lat, longitude: element.lon });
    options.push({ name, kind, latitude: element.lat, longitude: element.lon, walkMinutes: walkMinutesFor(distance), phone: tags.phone, distance });
  }
  return pickStays(options);
}

function openInMaps(stay: StayOption) {
  const label = encodeURIComponent(stay.name);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${label}&ll=${stay.latitude},${stay.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${stay.latitude},${stay.longitude}`;
  void Linking.openURL(url);
}

function formatCostRange({ from, to }: { from: number; to?: number }) {
  return to ? `${formatYen(from)}–${formatYen(to).slice(1)}` : `${formatYen(from)}~`;
}

async function fetchTaxiEstimate(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): Promise<TaxiEstimate | null> {
  const nowMs = Date.now();
  const lateNight = isLateNight(nowMs);
  if (apiBaseUrl) {
    try {
      // NAVITIME applies regional meter rates and the late-night surcharge itself.
      const route = await getTaxiEstimate({ fromLat: from.latitude, fromLon: from.longitude, toLat: to.latitude, toLon: to.longitude, startTime: formatJstDateTime(nowMs) });
      return { fareYen: route.fareYen ?? estimateTaxiFare(route.distanceMeters, lateNight), durationMinutes: Math.max(1, route.minutes), distanceKm: route.distanceMeters / 1000, lateNight };
    } catch {
      // Fall back to OpenStreetMap routing below.
    }
  }
  const response = await fetch(
    `https://routing.openstreetmap.de/routed-car/route/v1/driving/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=false&alternatives=false&steps=false`,
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { routes?: Array<{ distance: number; duration: number }> };
  const route = payload.routes?.[0];
  if (!route) return null;
  return { fareYen: estimateTaxiFare(route.distance, lateNight), durationMinutes: Math.max(1, Math.round(route.duration / 60)), distanceKm: route.distance / 1000, lateNight };
}

const STAY_META: Record<StayOption['kind'], { icon: React.ComponentProps<typeof Feather>['name']; ja: string; en: string }> = {
  'net-cafe': { icon: 'monitor', ja: 'ネットカフェ', en: 'Internet café' },
  karaoke: { icon: 'music', ja: 'カラオケ', en: 'Karaoke' },
  capsule: { icon: 'moon', ja: 'カプセルホテル', en: 'Capsule hotel' },
  hotel: { icon: 'briefcase', ja: 'ホテル', en: 'Hotel' },
};

export default function AlternativesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, status, destination, currentTime, firstTrain, minutesUntilFirstTrain, stationName, stationNameJa, userCoordinates, homeStationOption, isLocating, requestLocation } = useLastRide();
  const ja = language === 'ja';
  const [stays, setStays] = useState<StayOption[] | null>(null);
  const [staysError, setStaysError] = useState(false);
  const [isLoadingStays, setIsLoadingStays] = useState(false);
  const [taxi, setTaxi] = useState<TaxiEstimate | null>(null);
  const [isLoadingTaxi, setIsLoadingTaxi] = useState(false);
  const requestToken = useRef(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const token = ++requestToken.current;
    // Clear previous results so a new location never shows stale options while loading.
    setStays(null);
    setStaysError(false);
    setTaxi(null);
    if (!userCoordinates) {
      setIsLoadingStays(false);
      setIsLoadingTaxi(false);
      return;
    }
    setIsLoadingStays(true);
    fetchNearbyStays(userCoordinates.latitude, userCoordinates.longitude)
      .then((result) => {
        if (token === requestToken.current) setStays(result);
      })
      .catch(() => {
        if (token === requestToken.current) setStaysError(true);
      })
      .finally(() => {
        if (token === requestToken.current) setIsLoadingStays(false);
      });
    if (homeStationOption && (homeStationOption.latitude !== 0 || homeStationOption.longitude !== 0)) {
      setIsLoadingTaxi(true);
      fetchTaxiEstimate(userCoordinates, homeStationOption)
        .then((result) => {
          if (token === requestToken.current) setTaxi(result);
        })
        .catch(() => {
          if (token === requestToken.current) setTaxi(null);
        })
        .finally(() => {
          if (token === requestToken.current) setIsLoadingTaxi(false);
        });
    }
  }, [userCoordinates, homeStationOption, retryCount]);

  const station = ja ? stationNameJa : stationName;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), paddingBottom: 26 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <View style={styles.brand}><RailwayMark size={22} /><Text style={[styles.brandText, { color: colors.foreground }]}>LastRide</Text></View>
          <Text style={[styles.clock, { color: colors.mutedForeground }]}>{currentTime}</Text>
        </View>
        <View style={styles.heading}>
          <Text style={[styles.kicker, { color: status === 'departed' ? colors.destructive : colors.primary }]}>
            {status === 'departed' ? (ja ? '終電が発車しました' : 'THE LAST TRAIN HAS LEFT') : ja ? '乗れなかったときは' : 'IF YOU MISS IT'}
          </Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {status === 'departed' ? (ja ? '大丈夫。次の一手を\n選びましょう。' : 'It’s OK — let’s get\nyou home safely.') : ja ? '帰る方法は\nほかにもあります。' : 'Your backup\nways home.'}
          </Text>
        </View>

        {/* First train */}
        <View style={[styles.heroCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroBadge, { backgroundColor: colors.primary }]}><Feather name="sunrise" color={colors.primaryForeground} size={16} /></View>
            <Text style={[styles.heroLabel, { color: colors.primary }]}>{ja ? '始発を待つ' : 'WAIT FOR THE FIRST TRAIN'}</Text>
          </View>
          <Text style={[styles.heroTime, { color: colors.card }]}>{firstTrain}</Text>
          <Text style={[styles.heroSub, { color: colors.muted }]}>{ja ? `${station} → ${destination}` : `${station} → ${destination}`}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>{ja ? '待ち時間' : 'Wait'}</Text>
              <Text style={[styles.heroStatValue, { color: colors.card }]}>{minutesUntilFirstTrain === null ? '—' : formatDuration(minutesUntilFirstTrain, ja)}</Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: colors.mutedForeground }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>{ja ? '追加費用' : 'Extra cost'}</Text>
              <Text style={[styles.heroStatValue, { color: colors.card }]}>¥0</Text>
            </View>
          </View>
        </View>

        {/* Taxi */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? 'タクシーで帰る' : 'TAKE A TAXI'}</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Feather name="truck" color={colors.secondaryForeground} size={20} /></View>
            <View style={styles.cardCopy}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>{ja ? `${destination} まで` : `To ${destination}`}</Text>
              {isLoadingTaxi ? (
                <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{ja ? '概算を計算中…' : 'Calculating estimate…'}</Text>
              ) : taxi ? (
                <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{ja ? `約${taxi.durationMinutes}分 · ${taxi.distanceKm.toFixed(1)} km${taxi.lateNight ? ' · 深夜料金込み' : ''}` : `~${taxi.durationMinutes} min · ${taxi.distanceKm.toFixed(1)} km${taxi.lateNight ? ' · incl. late-night rate' : ''}`}</Text>
              ) : (
                <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{ja ? '現在地と自宅駅が必要です。' : 'Needs your location and home station.'}</Text>
              )}
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.cardCost, { color: colors.foreground }]}>{taxi ? formatYen(taxi.fareYen) : '—'}</Text>
              <Text style={[styles.cardCostLabel, { color: colors.mutedForeground }]}>{ja ? '概算' : 'est.'}</Text>
            </View>
          </View>
        </View>

        {/* Nearby stays */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '近くで朝まで過ごす' : 'STAY NEARBY UNTIL MORNING'}</Text>
          {!userCoordinates ? (
            <Pressable testID="alternatives-use-location" onPress={() => void requestLocation()} style={({ pressed }) => [styles.locationPrompt, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}>
              <Feather name="crosshair" color={colors.secondaryForeground} size={18} />
              <Text style={[styles.locationPromptText, { color: colors.secondaryForeground }]}>{isLocating ? (ja ? '現在地を取得中…' : 'Getting your location…') : ja ? '現在地から周辺の選択肢を表示' : 'Use my location to show nearby options'}</Text>
            </Pressable>
          ) : isLoadingStays ? (
            <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{ja ? '周辺を検索中…' : 'Searching around you…'}</Text>
            </View>
          ) : staysError ? (
            <Pressable testID="retry-stays" onPress={() => setRetryCount((count) => count + 1)} style={({ pressed }) => [styles.locationPrompt, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}>
              <Feather name="refresh-cw" color={colors.secondaryForeground} size={17} />
              <Text style={[styles.locationPromptText, { color: colors.secondaryForeground }]}>{ja ? '周辺検索が混み合っています。タップして再試行' : 'Nearby search was busy. Tap to retry'}</Text>
            </Pressable>
          ) : stays && stays.length > 0 ? (
            <View style={styles.list}>
              {stays.map((stay) => {
                const meta = STAY_META[stay.kind];
                return (
                  <Pressable
                    key={stay.name}
                    onPress={() => openInMaps(stay)}
                    accessibilityRole="link"
                    accessibilityLabel={ja ? `${stay.name}を地図で開く` : `Open ${stay.name} in Maps`}
                    style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={[styles.cardIcon, { backgroundColor: colors.secondary }]}><Feather name={meta.icon} color={colors.secondaryForeground} size={19} /></View>
                    <View style={styles.cardCopy}>
                      <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{stay.name}</Text>
                      <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>
                        {ja ? `${meta.ja} · 徒歩${stay.walkMinutes}分` : `${meta.en} · ${stay.walkMinutes} min walk`}
                        {stay.open24h ? (ja ? ' · 24時間営業' : ' · open 24h') : ''}
                      </Text>
                      <Text style={[styles.cardCostLabel, { color: colors.mutedForeground }]}>{formatCostRange(STAY_COSTS[stay.kind])} {ja ? '目安' : 'typical'}</Text>
                    </View>
                    {stay.phone && (
                      <Pressable
                        onPress={() => void Linking.openURL(`tel:${stay.phone}`)}
                        hitSlop={10}
                        accessibilityRole="button"
                        accessibilityLabel={ja ? `${stay.name}に電話` : `Call ${stay.name}`}
                        style={[styles.callButton, { backgroundColor: colors.secondary }]}
                      >
                        <Feather name="phone" color={colors.secondaryForeground} size={16} />
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.cardNote, { color: colors.mutedForeground }]}>{ja ? '徒歩圏内に宿泊できる場所が見つかりませんでした。' : 'No overnight spots found within walking distance.'}</Text>
          )}
          <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>{ja ? '料金は都内の一般的な深夜料金の目安です。営業時間は店舗にご確認ください。タップで地図を開きます。' : 'Prices are typical Tokyo overnight rates. Check opening hours with the venue. Tap a place to open it in Maps.'}</Text>
        </View>
      </ScrollView>
      <BottomNav language={language} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 22, paddingHorizontal: 20 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  brandText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  clock: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  heading: { gap: 8, marginTop: 4 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 34, letterSpacing: -1.3, lineHeight: 40 },
  heroCard: { borderRadius: 26, gap: 4, padding: 22 },
  heroTop: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  heroBadge: { alignItems: 'center', borderRadius: 10, height: 30, justifyContent: 'center', width: 30 },
  heroLabel: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 0.6 },
  heroTime: { fontFamily: 'Inter_700Bold', fontSize: 52, letterSpacing: -2.2, lineHeight: 60, marginTop: 6 },
  heroSub: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  heroStats: { alignItems: 'center', flexDirection: 'row', gap: 18, marginTop: 14 },
  heroStat: { gap: 2 },
  heroStatLabel: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  heroStatValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  heroDivider: { height: 30, opacity: 0.35, width: 1 },
  section: { gap: 9 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.9 },
  list: { gap: 10 },
  card: { alignItems: 'center', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  cardIcon: { alignItems: 'center', borderRadius: 13, height: 44, justifyContent: 'center', width: 44 },
  cardCopy: { flex: 1, gap: 3 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  cardNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  cardRight: { alignItems: 'flex-end', gap: 1 },
  cardCost: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  callButton: { alignItems: 'center', borderRadius: 12, height: 38, justifyContent: 'center', width: 38 },
  cardCostLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  locationPrompt: { alignItems: 'center', borderRadius: 18, flexDirection: 'row', gap: 11, padding: 15 },
  locationPromptText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  loadingBox: { alignItems: 'center', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 16 },
  disclaimer: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
});
