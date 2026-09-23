/**
 * What a night at a place typically costs. No provider we use gives prices, but
 * chains set theirs per brand, so a recognised chain gives a much better estimate
 * than a blanket figure per category.
 *
 * Tokyo, one person, late-night pack / free time. Verify against the venue.
 */
export type PriceRange = { from: number; to?: number };

export type StayKind = 'net-cafe' | 'karaoke' | 'capsule' | 'hotel';

/** Chain night-pack prices, matched against the venue name. */
const CHAIN_PRICES: Array<{ match: RegExp; range: PriceRange }> = [
  // Net cafés / manga cafés
  { match: /快活/, range: { from: 1700, to: 2600 } },
  { match: /自遊空間/, range: { from: 1500, to: 2500 } },
  { match: /マンボー/, range: { from: 1500, to: 2400 } },
  { match: /宝島24/, range: { from: 1800, to: 2800 } },
  { match: /アプレシオ/, range: { from: 1500, to: 2500 } },
  { match: /ダイス|DiCE/i, range: { from: 1500, to: 2500 } },
  { match: /メディアカフェポパイ|ポパイ/, range: { from: 1600, to: 2600 } },
  // Karaoke
  { match: /まねきねこ/, range: { from: 1000, to: 2000 } },
  { match: /ジャンカラ/, range: { from: 1000, to: 2000 } },
  { match: /歌広場/, range: { from: 1200, to: 2400 } },
  { match: /コート・?ダジュール/, range: { from: 1200, to: 2400 } },
  { match: /BanBan|バンバン/i, range: { from: 1200, to: 2400 } },
  { match: /カラオケ館/, range: { from: 1500, to: 2800 } },
  { match: /ビッグエコー/, range: { from: 1800, to: 3200 } },
  { match: /JOYSOUND|ジョイサウンド/i, range: { from: 1500, to: 3000 } },
];

/** Used when the venue's chain isn't recognised. */
const KIND_PRICES: Record<StayKind, PriceRange> = {
  'net-cafe': { from: 1500, to: 3000 },
  karaoke: { from: 1500, to: 3500 },
  capsule: { from: 3500, to: 6000 },
  hotel: { from: 8000 },
};

/** A price range for a venue, and whether it came from a recognised chain. */
export function stayPrice(name: string, kind: StayKind): { range: PriceRange; chain: boolean } {
  const chain = CHAIN_PRICES.find((entry) => entry.match.test(name));
  return chain ? { range: chain.range, chain: true } : { range: KIND_PRICES[kind], chain: false };
}

export function formatYen(amount: number) {
  return `¥${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatPriceRange({ from, to }: PriceRange) {
  return to ? `${formatYen(from)}–${formatYen(to).slice(1)}` : `${formatYen(from)}~`;
}
