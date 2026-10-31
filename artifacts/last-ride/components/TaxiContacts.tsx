/**
 * How to get a taxi where you are: the nearest taxi stand (walking directions),
 * or, with none within 1.5 km, local taxi companies to call. The first company
 * shows; the rest fold away (the far-station card keeps 現在地でもう一度探す in view).
 */
import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { openWalkingRoute } from "@/components/MapCard";
import { useColors } from "@/hooks/useColors";
import type { TaxiCompany, TaxiStand } from "@/lib/applePlaces";

export function TaxiContacts({
  stand,
  companies,
  ja,
  showAll = false,
}: {
  stand: TaxiStand | null;
  companies: TaxiCompany[];
  ja: boolean;
  /** List every company at once (the ways-home screen has the room). */
  showAll?: boolean;
}) {
  const colors = useColors();
  const [more, setMore] = useState(showAll);

  if (stand) {
    const walk = Math.max(1, Math.ceil((stand.meters * 1.3) / 80));
    return (
      <Pressable onPress={() => openWalkingRoute(stand)} accessibilityRole="button" style={styles.row}>
        <Feather name="map-pin" size={14} color={colors.mutedForeground} />
        <Text style={[styles.note, styles.flex, { color: colors.mutedForeground }]}>
          {ja ? `近くのタクシー乗り場：${stand.name}（徒歩約${walk}分）` : `Nearest taxi stand: ${stand.name} (about ${walk} min walk)`}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </Pressable>
    );
  }

  if (companies.length === 0) {
    return (
      <View style={styles.row}>
        <Feather name="map-pin" size={14} color={colors.mutedForeground} />
        <Text style={[styles.note, styles.flex, { color: colors.mutedForeground }]}>
          {ja ? "近く（1.5km以内）にタクシー乗り場は見つかりませんでした。" : "No taxi stand within 1.5 km."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.companies}>
      <Text style={[styles.note, { color: colors.mutedForeground }]}>
        {ja ? "近くにタクシー乗り場はありません。地元のタクシー会社に電話で呼べます。" : "No taxi stand nearby. A local taxi company can send one:"}
      </Text>
      {companies.slice(0, more ? undefined : 1).map((company) => (
        <Pressable
          key={company.phone}
          onPress={() => void Linking.openURL(`tel:${company.phone.replace(/-/g, "")}`).catch(() => undefined)}
          accessibilityRole="button"
          accessibilityLabel={ja ? `${company.name}に電話する` : `Call ${company.name}`}
          style={({ pressed }) => [styles.companyRow, { borderColor: colors.input, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={styles.flex}>
            <Text style={[styles.companyName, { color: colors.foreground }]} numberOfLines={1}>{company.name}</Text>
            <Text style={[styles.note, { color: colors.mutedForeground }]}>
              {company.phone}
              {ja ? `・約${(company.meters / 1000).toFixed(0)}km` : ` · ~${(company.meters / 1000).toFixed(0)} km`}
            </Text>
          </View>
          <Feather name="phone" size={16} color={colors.primary} />
          <Text style={[styles.callText, { color: colors.primary }]}>{ja ? "電話" : "Call"}</Text>
        </Pressable>
      ))}
      {companies.length > 1 && !showAll ? (
        <Pressable
          testID="more-taxi-companies"
          onPress={() => setMore((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: more }}
          hitSlop={6}
          style={styles.moreRow}
        >
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            {more
              ? ja ? "閉じる" : "Show fewer"
              : ja ? `ほかのタクシー会社（${companies.length - 1}件）` : `More taxi companies (${companies.length - 1})`}
          </Text>
          <Feather name={more ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  note: { fontSize: 13, lineHeight: 19 },
  companies: { gap: 8 },
  companyRow: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  companyName: { fontSize: 14, fontWeight: "700" },
  callText: { fontSize: 14, fontWeight: "800" },
  moreRow: { alignItems: "center", alignSelf: "flex-start", flexDirection: "row", gap: 4, paddingVertical: 2 },
});
