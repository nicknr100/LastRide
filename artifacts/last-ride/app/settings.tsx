import { BottomNav } from '@/components/BottomNav';
import { RailwayMark } from '@/components/RideUI';
import { REMINDER_CHOICES, useLastRide } from '@/context/LastRideContext';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MINUTE_MS } from '@/lib/time';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    language, homeStation, walkingSpeed, setWalkingSpeed, setLanguage,
    reminderIntervals, toggleReminderInterval, notificationsAllowed,
    demoActive, setDemoNow, nowMs, plan, currentTime, leaveBy, triggerTestNotification, resetAll,
  } = useLastRide();
  const ja = language === 'ja';
  const choices: Array<{ value: 'relaxed' | 'normal' | 'fast'; en: string; ja: string }> = [
    { value: 'relaxed', en: 'Relaxed', ja: 'ゆっくり' },
    { value: 'normal', en: 'Normal', ja: 'ふつう' },
    { value: 'fast', en: 'Fast', ja: '速め' },
  ];
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 18), paddingBottom: 26 }]}>
        <View style={styles.topbar}><View style={styles.brand}><RailwayMark size={22} /><Text style={[styles.brandText, { color: colors.foreground }]}>LastRide</Text></View></View>
        <View style={styles.heading}><Text style={[styles.kicker, { color: colors.primary }]}>{ja ? '自分に合わせる' : 'MAKE IT YOURS'}</Text><Text style={[styles.title, { color: colors.foreground }]}>{ja ? '設定' : 'Settings'}</Text></View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '帰宅先' : 'HOME'}</Text>
          <Pressable testID="edit-home-station" onPress={() => router.push('/home-station')} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconChip, { backgroundColor: colors.secondary }]}><Feather name="home" color={colors.secondaryForeground} size={18} /></View>
            <View style={styles.rowText}><Text style={[styles.rowTitle, { color: colors.foreground }]}>{homeStation || (ja ? '未設定' : 'Not set')}</Text><Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{ja ? '自宅の最寄り駅' : 'Home station'}</Text></View>
            <Feather name="chevron-right" color={colors.mutedForeground} size={19} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '出発リマインダー' : 'LEAVE REMINDERS'}</Text>
          <View style={[styles.chipsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {REMINDER_CHOICES.map((minutes) => {
              const active = reminderIntervals.includes(minutes);
              return (
                <Pressable key={minutes} testID={`reminder-${minutes}`} onPress={() => toggleReminderInterval(minutes)} style={[styles.chip, { backgroundColor: active ? colors.primary : colors.secondary }]}>
                  <Text style={[styles.chipText, { color: active ? colors.primaryForeground : colors.mutedForeground }]}>{ja ? `${minutes}分前` : `${minutes} min`}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? '夜のトラッキング中に、出発時刻の前に選んだタイミングと出発時刻ちょうどに通知します。乗り遅れた場合は、ほかの帰り方もお知らせします。その後トラッキングは自動でオフになります。' : 'While night-out tracking is on, you’ll be notified at each selected time before leave-by, when it’s time to go, and with other ways home if you miss it. Tracking then switches off by itself.'}</Text>
          {Platform.OS !== 'web' ? (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? 'アプリを閉じていても、画面がロックされていても通知は届きます。' : 'Reminders arrive even when the app is closed or your screen is locked.'}</Text>
          ) : (
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? 'ブラウザ版では、このタブを開いている間のみ通知が届きます。スマホアプリ版では、アプリを閉じていても届きます。' : 'In the browser, reminders only arrive while this tab is open. In the phone app, they arrive even when the app is closed.'}</Text>
          )}
          {notificationsAllowed === false && (
            <Text style={[styles.hint, { color: colors.destructive }]}>{ja ? '通知が許可されていません。端末の設定から許可してください。' : 'Notifications are not allowed. Please enable them in your device settings.'}</Text>
          )}
        </View>

        {__DEV__ && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? 'デモモード（開発用）' : 'DEMO MODE (DEV ONLY)'}</Text>
            <View style={[styles.demoBox, { backgroundColor: colors.card, borderColor: demoActive ? colors.primary : colors.border }]}>
              <View style={styles.demoTop}>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]}>{ja ? '時刻を動かす' : 'Shift the clock'}</Text>
                  <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>{ja ? `現在時刻：${currentTime}（出発 ${leaveBy}）` : `Clock: ${currentTime} (leave by ${leaveBy})`}</Text>
                </View>
                {demoActive && (
                  <Pressable testID="demo-reset" onPress={() => setDemoNow(null)} style={[styles.resetChip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{ja ? 'リセット' : 'Reset'}</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.demoControls}>
                {[-30, -5, 5, 30].map((delta) => (
                  <Pressable key={delta} testID={`demo-shift-${delta}`} onPress={() => setDemoNow(nowMs + delta * MINUTE_MS)} style={[styles.chip, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.chipText, { color: colors.secondaryForeground }]}>{delta > 0 ? `+${delta}` : delta}{ja ? '分' : 'm'}</Text>
                  </Pressable>
                ))}
                {plan && (
                  <Pressable testID="demo-jump-leave" onPress={() => setDemoNow(plan.leaveByMs - (Math.max(0, ...reminderIntervals) + 1) * MINUTE_MS)} style={[styles.chip, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.chipText, { color: colors.primaryForeground }]}>{ja ? '出発直前へ' : 'Jump near leave'}</Text>
                  </Pressable>
                )}
              </View>
              <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? 'デモ中は1分＝1秒で進み、リマインダーがすぐ届きます。' : 'While the demo clock is set, 1 minute = 1 second, so reminders arrive quickly.'}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '通知とデータ' : 'NOTIFICATIONS & DATA'}</Text>
          <View style={[styles.demoBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Pressable testID="test-notification" onPress={() => void triggerTestNotification()} style={({ pressed }) => [styles.testButton, { backgroundColor: colors.foreground, opacity: pressed ? 0.8 : 1 }]}>
              <Feather name="bell" color={colors.card} size={16} />
              <Text style={[styles.testButtonText, { color: colors.card }]}>{ja ? 'テスト通知を送る' : 'Send test notification'}</Text>
            </Pressable>
            <Pressable
              testID="reset-all"
              onPress={() => {
                void resetAll().then(() => router.replace('/'));
              }}
              style={({ pressed }) => [styles.resetButton, { borderColor: colors.destructive, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="rotate-ccw" color={colors.destructive} size={16} />
              <Text style={[styles.testButtonText, { color: colors.destructive }]}>{ja ? '最初からやり直す' : 'Reset & start over'}</Text>
            </Pressable>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? '保存した言語・自宅駅・設定をすべて消去して、最初の画面に戻ります。' : 'Clears your saved language, home station, and settings, and returns to the welcome screen.'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '歩くペース' : 'WALKING PACE'}</Text>
          <View style={[styles.speedBox, { backgroundColor: colors.card, borderColor: colors.border }]}>{choices.map((choice) => <Pressable key={choice.value} onPress={() => setWalkingSpeed(choice.value)} style={[styles.speed, { backgroundColor: walkingSpeed === choice.value ? colors.primary : 'transparent' }]}><Text style={[styles.speedText, { color: walkingSpeed === choice.value ? colors.primaryForeground : colors.mutedForeground }]}>{ja ? choice.ja : choice.en}</Text></Pressable>)}</View>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>{ja ? '最寄り駅までの到着時間をあなたの歩く速さに合わせて計算します。' : 'Your leave-by time adjusts to the pace you choose.'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{ja ? '言語' : 'LANGUAGE'}</Text>
          <View style={[styles.speedBox, { backgroundColor: colors.card, borderColor: colors.border }]}>{(['ja', 'en'] as const).map((choice) => <Pressable key={choice} onPress={() => setLanguage(choice)} style={[styles.speed, { backgroundColor: language === choice ? colors.primary : 'transparent' }]}><Text style={[styles.speedText, { color: language === choice ? colors.primaryForeground : colors.mutedForeground }]}>{choice === 'ja' ? '日本語' : 'English'}</Text></Pressable>)}</View>
        </View>
      </ScrollView>
      <BottomNav language={language} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, gap: 24, paddingHorizontal: 20 },
  topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  brandText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  heading: { gap: 6 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.2 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 38, letterSpacing: -1.4 },
  section: { gap: 9 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 0.9 },
  row: { alignItems: 'center', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  iconChip: { alignItems: 'center', borderRadius: 13, height: 42, justifyContent: 'center', width: 42 },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  rowSub: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  chipsBox: { borderRadius: 18, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 },
  chip: { alignItems: 'center', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  chipText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  demoBox: { borderRadius: 20, borderWidth: 1.5, gap: 12, padding: 14 },
  demoTop: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  demoControls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resetChip: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  testButton: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  resetButton: { alignItems: 'center', borderRadius: 15, borderWidth: 1.5, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 },
  testButtonText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  speedBox: { borderRadius: 18, borderWidth: 1, flexDirection: 'row', padding: 4 },
  speed: { alignItems: 'center', borderRadius: 14, flex: 1, paddingVertical: 12 },
  speedText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
});
