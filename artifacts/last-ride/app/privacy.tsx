import { PressableIcon, RailwayMark } from '@/components/RideUI';
import { useLastRide } from '@/context/LastRideContext';
import { useColors } from '@/hooks/useColors';
import { router } from 'expo-router';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Kept in step with PRIVACY.md at the repo root; this is the short version users see. */
function copy(ja: boolean) {
  return ja
    ? {
        title: 'プライバシー',
        intro: 'LastRideはアカウント登録なしで使えます。氏名・メールアドレス・連絡先などは取得しません。データを広告目的で利用したり、販売したりすることはありません。',
        sections: [
          {
            heading: '取得する情報',
            body: '現在地（緯度経度）、自宅の最寄り駅（設定した場合は住所も）、言語・歩くペース・リマインダーなどの設定です。設定内容は端末内に保存されます。',
          },
          {
            heading: '位置情報を使うとき',
            body: 'アプリを開いている間と、「夜のトラッキング」をオンにしている間のバックグラウンドです。トラッキングはご自身でオンにしたときのみ動作し、その夜の通知が終わると（遅くとも4時に）自動で停止します。端末の設定でいつでも許可を取り消せます。',
          },
          {
            heading: '送信先',
            body: '経路・運賃の検索のために駅すぱあと API（株式会社ヴァル研究所）へ、周辺の駅・徒歩・車のルート・周辺施設の検索のためにNAVITIME JAPAN（RapidAPI経由）へ、必要な位置情報のみを送信します。これらが利用できないときはOpenStreetMapのサービスを補助的に使います。アカウントがないため、これらの事業者にあなたを特定する情報は渡りません。',
          },
          {
            heading: '保存期間',
            body: 'サーバーでは同じ問い合わせを繰り返さないために、約100mに丸めた位置をキーとして最大24時間だけ結果をキャッシュします。利用者と結び付ける情報はありません。端末内のデータは「最初からやり直す」またはアプリの削除で消去できます。',
          },
        ],
        more: '詳細は、リポジトリの PRIVACY.md をご覧ください。',
      }
    : {
        title: 'Privacy',
        intro: 'LastRide works without an account. It never asks for your name, email or contacts, and your data is not sold or used for advertising.',
        sections: [
          {
            heading: 'What it collects',
            body: 'Your location (GPS coordinates), your home station (and home address if you add one), and your settings — language, walking pace and reminder times. Settings stay on your phone.',
          },
          {
            heading: 'When location is used',
            body: 'While the app is open, and in the background while night-out tracking is on. Tracking only runs when you switch it on, and stops by itself once the night’s reminders are done (by 04:00 at the latest). You can revoke location access at any time in your phone’s settings.',
          },
          {
            heading: 'Who else sees it',
            body: 'Coordinates and station names go to 駅すぱあと API (Val Laboratory) for train times and fares, and to NAVITIME JAPAN (via RapidAPI) for nearby stations, walking and driving routes, and places. OpenStreetMap services are used only as a fallback. Because there is no account, none of them receive anything that identifies you.',
          },
          {
            heading: 'How long it is kept',
            body: 'The server caches answers for up to 24 hours to avoid repeating paid lookups, keyed by an approximate location rounded to about a 100-metre grid and never by a user. Everything on your phone can be erased with “Reset & start over”, or by uninstalling the app.',
          },
        ],
        more: 'The full policy is in PRIVACY.md in the project repository.',
      };
}

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language } = useLastRide();
  const text = copy(language === 'ja');

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topbar}>
          <PressableIcon icon="arrow-left" onPress={() => router.back()} testID="privacy-back" />
          <RailwayMark size={22} />
          <View style={styles.spacer} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{text.title}</Text>
        <Text style={[styles.intro, { color: colors.foreground }]}>{text.intro}</Text>
        {text.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={[styles.heading, { color: colors.foreground }]}>{section.heading}</Text>
            <Text style={[styles.body, { color: colors.mutedForeground }]}>{section.body}</Text>
          </View>
        ))}
        <Text style={[styles.body, { color: colors.mutedForeground }]}>{text.more}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 18, paddingHorizontal: 20 },
  topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  spacer: { width: 38 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 32, letterSpacing: -1.2 },
  intro: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 23 },
  section: { gap: 6 },
  heading: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20 },
});
