import { RailwayMark, PressableIcon } from '@/components/RideUI';
import { searchStations, StationOption, useLastRide } from '@/context/LastRideContext';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeStationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { language, homeStationOption, saveHomeStation, resetLanguage } = useLastRide();
  const [query, setQuery] = useState(homeStationOption ? (language === 'ja' ? homeStationOption.nameJa : homeStationOption.name) : '');
  const [results, setResults] = useState<StationOption[]>([]);
  const [selected, setSelected] = useState<StationOption | null>(homeStationOption);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const searchToken = useRef(0);
  const ja = language === 'ja';

  useEffect(() => {
    const trimmed = query.trim();
    const selectedLabel = selected ? (ja ? selected.nameJa : selected.name) : null;
    const token = ++searchToken.current;
    if (trimmed.length < 2 || trimmed === selectedLabel) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    setSearchError(false);
    const timer = setTimeout(() => {
      searchStations(trimmed)
        .then((options) => {
          if (token !== searchToken.current) return;
          setResults(options);
          setIsSearching(false);
        })
        .catch(() => {
          if (token !== searchToken.current) return;
          setSearchError(true);
          setResults([]);
          setIsSearching(false);
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [query, selected, ja]);

  const pickStation = (station: StationOption) => {
    setSelected(station);
    setQuery(ja ? station.nameJa : station.name);
    setResults([]);
  };

  const continueToRide = () => {
    if (!selected) return;
    saveHomeStation(selected);
    router.replace('/ride');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 12), paddingBottom: Platform.OS === 'web' ? 46 : 28 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.topbar}>
          <PressableIcon
            icon="arrow-left"
            onPress={() => {
              // Clear the language choice first — otherwise the welcome screen redirects right back here.
              resetLanguage();
              router.replace('/');
            }}
            testID="back-to-language"
          />
          <RailwayMark size={25} />
          <View style={styles.placeholder} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.kicker, { color: colors.primary }]}>{ja ? 'まずは帰る場所' : 'ONE-TIME SETUP'}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{ja ? '自宅の最寄り駅を\n教えてください。' : 'Where should we\nget you home to?'}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{ja ? '駅名で検索して、正しい駅を選んでください。' : 'Search by name and pick the exact station.'}</Text>
        </View>
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.foreground }]}>{ja ? '自宅の最寄り駅' : 'Home station'}</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: selected ? colors.primary : colors.border }]}>
            <Feather name="search" color={colors.mutedForeground} size={19} />
            <TextInput
              testID="home-station-input"
              autoFocus
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setSelected(null);
              }}
              placeholder={ja ? '例：渋谷、横浜' : 'e.g. Shibuya, Yokohama'}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              returnKeyType="search"
            />
            {isSearching ? <ActivityIndicator size="small" color={colors.primary} /> : selected ? <Feather name="check-circle" color={colors.primary} size={19} /> : null}
          </View>
          {results.length > 0 && (
            <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {results.map((station, index) => (
                <Pressable
                  key={`${station.nameJa}-${station.latitude}-${station.longitude}`}
                  testID={`station-result-${index}`}
                  onPress={() => pickStation(station)}
                  style={({ pressed }) => [styles.resultRow, { borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 }]}
                >
                  <View style={[styles.resultIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="map-pin" color={colors.secondaryForeground} size={15} />
                  </View>
                  <View style={styles.resultCopy}>
                    <Text style={[styles.resultTitle, { color: colors.foreground }]}>{ja ? station.nameJa : station.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
                      {[ja ? station.regionJa : station.region, ja ? station.name : station.nameJa].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Feather name="chevron-right" color={colors.mutedForeground} size={17} />
                </Pressable>
              ))}
            </View>
          )}
          {searchError && <Text style={[styles.helper, { color: colors.destructive ?? '#d05656' }]}>{ja ? '検索に失敗しました。もう一度お試しください。' : 'Search failed. Please try again.'}</Text>}
          {!searchError && !selected && query.trim().length >= 2 && !isSearching && results.length === 0 && (
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>{ja ? '該当する駅が見つかりません。表記を変えてみてください。' : 'No matching stations. Try a different spelling.'}</Text>
          )}
          {selected && <Text style={[styles.helper, { color: colors.mutedForeground }]}>{ja ? `「${selected.nameJa}」を自宅の最寄り駅として保存します。` : `“${selected.name}” will be saved as your home station.`}</Text>}
        </View>
        <Pressable testID="save-home-station" disabled={!selected} onPress={continueToRide} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: !selected ? 0.4 : pressed ? 0.8 : 1 }]}>
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{ja ? 'LastRideをはじめる' : 'Start using LastRide'}</Text>
          <Feather name="arrow-right" color={colors.primaryForeground} size={19} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: 26, paddingHorizontal: 20 },
  topbar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  placeholder: { width: 38 },
  heading: { gap: 11, marginTop: 5 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.3 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 37, letterSpacing: -1.4, lineHeight: 44 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  form: { gap: 9 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  inputWrap: { alignItems: 'center', borderRadius: 18, borderWidth: 1.5, flexDirection: 'row', gap: 11, paddingHorizontal: 15 },
  input: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 16, minHeight: 58 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, paddingHorizontal: 2 },
  resultBox: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  resultRow: { alignItems: 'center', flexDirection: 'row', gap: 11, paddingHorizontal: 14, paddingVertical: 12 },
  resultIcon: { alignItems: 'center', borderRadius: 10, height: 32, justifyContent: 'center', width: 32 },
  resultCopy: { flex: 1, gap: 1 },
  resultTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  resultSub: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  button: { alignItems: 'center', borderRadius: 22, flexDirection: 'row', justifyContent: 'center', minHeight: 64, gap: 10 },
  buttonText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});
