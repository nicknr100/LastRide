import { BottomNav } from '@/components/BottomNav';
import { Notice, RailwayMark } from '@/components/RideUI';
import { locationErrorText, useLastRide } from '@/context/LastRideContext';
import type { RideStatus } from '@/lib/planner';
import { formatDuration, formatJstTime } from '@/lib/time';
import { shortLineName } from '@/lib/timetable';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function statusText(status: RideStatus, minutesLeft: number, lastTrain: string, ja: boolean) {
  switch (status) {
    case 'relaxed':
      return ja ? `あと${formatDuration(minutesLeft, true)}` : `in ${formatDuration(minutesLeft, false)}`;
    case 'soon':
      return ja ? `あと${minutesLeft}分 — そろそろ支度を` : `in ${minutesLeft} min — start wrapping up`;
    case 'now':
      return ja ? '今すぐ出発してください' : 'Leave now';
    case 'hurry':
      return ja ? `急いで — 終電は${lastTrain}発` : `Hurry — last train leaves at ${lastTrain}`;
    case 'departed':
      return ja ? `終電は${lastTrain}に発車しました` : `Last train left at ${lastTrain}`;
  }
}

function copy(language: 'ja' | 'en') {
  return language === 'ja'
    ? { greeting: '今夜の帰り道', nearby: '現在地の近く', walk: '徒歩', leave: '出発する目安', last: '終電', destination: '行き先', set: '予定を調整', location: '位置情報を使う', locationHelp: '最寄り駅と徒歩時間を正確にします', sample: 'サンプルの時刻です', sampleHelp: '時刻表データはまだ接続されていません。表示中の終電時刻は仮の値で、実際のダイヤではありません。' }
    : { greeting: 'Your way home tonight', nearby: 'Near your location', walk: 'walk', leave: 'Suggested leave-by', last: 'Last train', destination: 'Destination', set: 'Adjust plan', location: 'Use my location', locationHelp: 'Find your closest station and walking time.', sample: 'Sample train times', sampleHelp: 'Live timetables aren’t connected yet. The last train shown is a placeholder, not a real schedule.' };
}

export default function RideScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, plan, setPinnedStation, homeStation, stationName, stationNameJa, destination, leaveBy, lastTrain, lastTrainSource, minutesUntilLeave, status, walkingMinutes, walkingDistanceMeters, isLocationReady, isLocating, locationError, requestLocation, currentTime, demoActive, trackingMode, startTracking, stopTracking } = useLastRide();
  const ja = language === 'ja';
  const text = copy(language ?? 'en');

  useEffect(() => {
    if (homeStation && !isLocationReady && !isLocating && !locationError) void requestLocation();
  }, [homeStation, isLocationReady, isLocating, locationError, requestLocation]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), paddingBottom: 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <View style={styles.brand}><RailwayMark size={23} /><Text style={[styles.brandText, { color: colors.foreground }]}>LastRide</Text></View>
          <Pressable onPress={() => router.push('/settings')} testID="open-settings" hitSlop={12} accessibilityRole="button" accessibilityLabel={ja ? '設定' : 'Settings'}><Feather name="sliders" color={colors.foreground} size={21} /></Pressable>
        </View>
        <View style={styles.intro}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>{currentTime} · {text.greeting}{demoActive ? (ja ? ' · デモ時刻' : ' · demo clock') : ''}</Text>
          <Text style={[styles.station, { color: colors.foreground }]}>{ja ? stationNameJa : stationName}</Text>
          <Text style={[styles.nearby, { color: colors.mutedForeground }]}>{isLocating ? (ja ? '現在地から最寄り駅を検索中…' : 'Finding your closest station…') : walkingMinutes ? (ja ? `${text.nearby} · ${text.walk}${walkingMinutes}分` : `${text.nearby} · ${walkingMinutes} min ${text.walk}`) : text.nearby}</Text>
          <Text style={[styles.routeLine, { color: colors.secondaryForeground }]}>{ja ? `${stationNameJa} から ${destination} 方面` : `${stationName} → ${destination}`}</Text>
        </View>

        {plan?.pinned && (() => {
          const gain = Math.round((plan.autoPick.leaveByMs - plan.leaveByMs) / 60000);
          const autoName = ja ? plan.autoPick.station.nameJa : plan.autoPick.station.name;
          return (
            <View style={[styles.pinnedBanner, { backgroundColor: colors.secondary }]}>
              <Feather name="map-pin" color={colors.primary} size={18} />
              <View style={styles.trackCopy}>
                <Text style={[styles.locationTitle, { color: colors.secondaryForeground }]}>{ja ? `${stationNameJa}を選択中` : `You picked ${stationName}`}</Text>
                <Text style={[styles.locationBody, { color: gain >= 5 ? colors.destructive : colors.mutedForeground }]}>
                  {gain >= 5
                    ? ja ? `自動なら${autoName}で${gain}分遅く出られます。` : `${autoName} would give you ${gain} more minutes.`
                    : ja ? '自動での駅の切り替えは止まっています。' : 'Automatic station switching is paused.'}
                </Text>
              </View>
              <Pressable testID="back-to-auto" onPress={() => setPinnedStation(null)} accessibilityRole="button" style={({ pressed }) => [styles.autoButton, { backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1 }]}>
                <Text style={[styles.autoButtonText, { color: colors.card }]}>{ja ? '自動に戻す' : 'Back to auto'}</Text>
              </Pressable>
            </View>
          );
        })()}

        <View style={[styles.countdownCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.cardTop}><Text style={[styles.cardCaption, { color: colors.primary }]}>{text.leave}</Text><Feather name="clock" color={colors.primary} size={18} /></View>
          <Text style={[styles.leaveTime, { color: colors.card }]}> {leaveBy}</Text>
          <View style={styles.timeline}><View style={[styles.line, { backgroundColor: colors.mutedForeground }]} /><View style={[styles.dot, { backgroundColor: colors.primary }]} /><View style={[styles.dot, styles.finish, { backgroundColor: colors.card }]} /></View>
          <View style={styles.timeLabels}><Text style={[styles.label, { color: colors.muted }]}>{ja ? '現在地から' : 'From your location'}</Text><Text style={[styles.label, { color: colors.muted }]}>{lastTrain} {text.last}{lastTrainSource === 'sample' ? (ja ? '（仮）' : ' (sample)') : ''}</Text></View>
          {status && minutesUntilLeave !== null && (
            <View style={[styles.statusPill, { backgroundColor: status === 'hurry' ? colors.destructive : status === 'departed' ? colors.mutedForeground : status === 'relaxed' ? colors.secondaryForeground : colors.primary }]}>
              <Feather name={status === 'hurry' ? 'alert-triangle' : status === 'departed' ? 'moon' : status === 'relaxed' ? 'clock' : 'bell'} size={14} color={status === 'soon' || status === 'now' ? colors.primaryForeground : colors.card} />
              <Text style={[styles.statusText, { color: status === 'soon' || status === 'now' ? colors.primaryForeground : colors.card }]}>{statusText(status, minutesUntilLeave, lastTrain, ja)}</Text>
            </View>
          )}
        </View>

        {status === 'departed' && (
          <Pressable testID="missed-prompt" onPress={() => router.replace('/alternatives')} accessibilityRole="button" style={({ pressed }) => [styles.trackButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}>
            <Feather name="compass" color={colors.primaryForeground} size={18} />
            <View style={styles.trackCopy}>
              <Text style={[styles.locationTitle, { color: colors.primaryForeground }]}>{ja ? '終電に間に合いませんでしたか？' : 'Missed the last train?'}</Text>
              <Text style={[styles.locationBody, { color: colors.primaryForeground }]}>{ja ? '始発・タクシー・近くで朝まで過ごせる場所を見る' : 'See the first train, a taxi, and places to stay nearby'}</Text>
            </View>
            <Feather name="chevron-right" color={colors.primaryForeground} size={18} />
          </Pressable>
        )}

        {plan?.lastTrain.legs && plan.lastTrain.legs.length > 0 && (
          <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.routeHeader}>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{ja ? '終電のルート' : 'Last train route'}</Text>
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                {plan.lastTrain.transfers ? (ja ? `乗換${plan.lastTrain.transfers}回` : `${plan.lastTrain.transfers} transfer${plan.lastTrain.transfers > 1 ? 's' : ''}`) : ja ? '乗換なし' : 'Direct'}
              </Text>
            </View>
            {plan.lastTrain.legs.map((leg) => (
              <View key={`${leg.line}-${leg.departsAt}`} style={styles.leg}>
                <Text style={[styles.legTime, { color: colors.foreground }]}>{formatJstTime(leg.departsAt)}</Text>
                <View style={styles.legCopy}>
                  <Text style={[styles.detailValue, { color: colors.foreground }]}>{ja ? `${leg.from} → ${leg.to}` : `${leg.fromEn ?? leg.from} → ${leg.toEn ?? leg.to}`}</Text>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{ja ? shortLineName(leg.line) : (leg.lineEn ?? shortLineName(leg.line))}</Text>
                </View>
              </View>
            ))}
            {plan.lastTrain.arrivesAt && (
              <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{ja ? `${destination}着 ${formatJstTime(plan.lastTrain.arrivesAt)}` : `Arrives ${destination} ${formatJstTime(plan.lastTrain.arrivesAt)}`}</Text>
            )}
          </View>
        )}

        {plan && (plan.alternatives ?? []).length > 0 && (
          <View style={[styles.routeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{ja ? 'ほかの駅から帰る場合' : 'Other stations nearby'}</Text>
            {plan.alternatives.map((option) => {
              const isAutoPick = plan.pinned && option.station.nameJa === plan.autoPick.station.nameJa;
              const name = ja ? option.station.nameJa : option.station.name;
              return (
                <Pressable
                  key={option.station.nameJa}
                  testID={`use-station-${option.station.nameJa}`}
                  onPress={() => setPinnedStation(isAutoPick ? null : option.station)}
                  accessibilityRole="button"
                  accessibilityLabel={ja ? `${name}から帰る` : `Leave from ${name} instead`}
                  style={({ pressed }) => [styles.leg, styles.altRow, { opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.legTime, { color: colors.foreground }]}>{formatJstTime(option.leaveByMs)}</Text>
                  <View style={styles.legCopy}>
                    <Text style={[styles.detailValue, { color: colors.foreground }]}>
                      {name}
                      {isAutoPick ? <Text style={[styles.detailLabel, { color: colors.primary }]}>{ja ? '  自動のおすすめ' : '  Automatic pick'}</Text> : null}
                    </Text>
                    <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
                      {ja ? `徒歩${option.walkingMinutes}分 · 終電 ${formatJstTime(option.lastTrain.departsAt)}` : `${option.walkingMinutes} min walk · last train ${formatJstTime(option.lastTrain.departsAt)}`}
                    </Text>
                  </View>
                  <Feather name="repeat" color={colors.mutedForeground} size={16} />
                </Pressable>
              );
            })}
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
              {ja
                ? '時刻は出発する目安です。タップするとその駅に切り替えます。自動では、10分以上遅く出られる場合のみ遠い駅を選びます。'
                : 'Times are when to leave. Tap a station to switch to it. On automatic, a farther station is only chosen if it gives you 10+ more minutes.'}
            </Text>
          </View>
        )}

        <View style={styles.details}>
          <Pressable onPress={() => router.push('/settings')} style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.secondary }]}><Feather name="home" color={colors.secondaryForeground} size={18} /></View>
            <View style={styles.detailCopy}><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{text.destination}</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{destination}</Text></View>
            <Feather name="edit-3" color={colors.mutedForeground} size={17} />
          </Pressable>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.secondary }]}><Feather name="map-pin" color={colors.secondaryForeground} size={18} /></View>
            <View style={styles.detailCopy}><Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>{ja ? '徒歩距離' : 'Walking distance'}</Text><Text style={[styles.detailValue, { color: colors.foreground }]}>{walkingDistanceMeters ? `${(walkingDistanceMeters / 1000).toFixed(1)} km · ${ja ? `${walkingMinutes}分` : `${walkingMinutes} min`}` : isLocating ? (ja ? '計算中…' : 'Calculating…') : '—'}</Text></View>
            <Feather name="crosshair" color={colors.primary} size={18} />
          </View>
        </View>

        {/* After the last train there is nothing left to track, so only show the stop button if it's still on. */}
        {isLocationReady && (status !== 'departed' || trackingMode !== null) && (
          trackingMode === null ? (
            <Pressable testID="start-tracking" onPress={() => void startTracking()} style={({ pressed }) => [styles.trackButton, { backgroundColor: colors.foreground, opacity: pressed ? 0.85 : 1 }]}>
              <Feather name="navigation" color={colors.primary} size={18} />
              <View style={styles.trackCopy}>
                <Text style={[styles.locationTitle, { color: colors.card }]}>{ja ? '夜のトラッキングを開始' : 'Start night-out tracking'}</Text>
                <Text style={[styles.locationBody, { color: colors.muted }]}>{ja ? '出発リマインダーをオンにして、移動に合わせて最寄り駅と出発時刻を更新します。終電のあとは自動でオフになります。' : 'Turns on leave reminders and keeps your station and leave-by time up to date as you move. Switches off by itself after the last train.'}</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable testID="stop-tracking" onPress={() => void stopTracking()} style={({ pressed }) => [styles.trackButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.75 : 1 }]}>
              <Feather name="navigation" color={colors.secondaryForeground} size={18} />
              <View style={styles.trackCopy}>
                <Text style={[styles.locationTitle, { color: colors.secondaryForeground }]}>{ja ? 'トラッキング中 — タップで停止' : 'Tracking on — tap to stop'}</Text>
                <Text style={[styles.locationBody, { color: colors.mutedForeground }]}>
                  {trackingMode === 'background'
                    ? ja ? 'アプリを閉じても最寄り駅と通知を更新し続けます。終電のあと（遅くとも4時）に自動でオフになります。' : 'Keeps updating your station and reminders even when the app is closed. Switches off after the last train (04:00 at the latest).'
                    : ja ? 'アプリを開いている間、移動に合わせて更新します。（バックグラウンド更新は製品版アプリで有効になります）' : 'Updates as you move while the app is open. (Background updates activate in the installed app build.)'}
                </Text>
              </View>
            </Pressable>
          )
        )}

        {!isLocationReady ? <Pressable testID="enable-location" onPress={() => void requestLocation()} style={({ pressed }) => [styles.locationButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}><Feather name="crosshair" color={colors.secondaryForeground} size={18} /><View><Text style={[styles.locationTitle, { color: colors.secondaryForeground }]}>{isLocating ? (ja ? '最寄り駅を検索中…' : 'Finding your closest station…') : text.location}</Text><Text style={[styles.locationBody, { color: colors.mutedForeground }]}>{locationError ? locationErrorText(locationError, ja) : text.locationHelp}</Text></View></Pressable> : plan?.pinned ? null : <Notice icon="check-circle" title={ja ? `${stationNameJa}を検出` : `${stationName} detected`} body={ja ? '現在地から最寄り駅と徒歩距離を自動計算しました。' : 'Closest station and walking distance calculated from your location.'} />}

        {lastTrainSource === 'sample' && <Notice icon="info" title={text.sample} body={text.sampleHelp} />}
      </ScrollView>
      <BottomNav language={language} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 20, paddingHorizontal: 20 },
  topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  brandText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  intro: { gap: 4, marginTop: 6 },
  eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 13, letterSpacing: 0.2 },
  station: { fontFamily: 'Inter_700Bold', fontSize: 36, letterSpacing: -1.3 },
  nearby: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  routeLine: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 7 },
  countdownCard: { borderRadius: 27, padding: 22 },
  cardTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardCaption: { fontFamily: 'Inter_700Bold', fontSize: 13, letterSpacing: 0.3, textTransform: 'uppercase' },
  leaveTime: { fontFamily: 'Inter_700Bold', fontSize: 57, letterSpacing: -2.4, lineHeight: 65, marginTop: 7 },
  timeline: { height: 14, justifyContent: 'center', marginTop: 10, position: 'relative' },
  line: { height: 2, width: '100%' },
  dot: { borderRadius: 7, height: 14, left: '12%', position: 'absolute', width: 14 },
  finish: { left: '94%' },
  timeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  statusPill: { alignItems: 'center', alignSelf: 'flex-start', borderRadius: 14, flexDirection: 'row', gap: 7, marginTop: 14, paddingHorizontal: 12, paddingVertical: 8 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  details: { gap: 10 },
  altRow: { alignItems: 'center' },
  pinnedBanner: { alignItems: 'center', borderRadius: 19, flexDirection: 'row', gap: 12, padding: 14 },
  autoButton: { borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9 },
  autoButtonText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  routeCard: { borderRadius: 20, borderWidth: 1, gap: 12, padding: 16 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  leg: { alignItems: 'flex-start', flexDirection: 'row', gap: 14 },
  legTime: { fontFamily: 'Inter_700Bold', fontSize: 16, width: 50 },
  legCopy: { flex: 1, gap: 2 },
  detailCard: { alignItems: 'center', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 14 },
  iconChip: { alignItems: 'center', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  detailCopy: { flex: 1, gap: 2 },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  detailValue: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  locationButton: { alignItems: 'center', borderRadius: 19, flexDirection: 'row', gap: 12, padding: 15 },
  trackButton: { alignItems: 'center', borderRadius: 19, flexDirection: 'row', gap: 12, padding: 15 },
  trackCopy: { flex: 1 },
  locationTitle: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  locationBody: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
});