/**
 * English names for Ekispert line names ("ＪＲ山手線外回り" → "JR Yamanote Line
 * (outer loop)"). Ekispert's own English data is a paid option, so this covers
 * the operators and lines of the Tokyo and Osaka areas; anything unrecognised
 * stays in Japanese rather than becoming a half-translated mix.
 */
import { kanaToRomaji } from "./romaji";

/** Service types that follow the line name, longest first so "通勤快速" wins over "快速". */
const SERVICES: Array<[string, string]> = [
  ["通勤特快", "Commuter Special Rapid"],
  ["特別快速", "Special Rapid"],
  ["通勤快速", "Commuter Rapid"],
  ["区間快速", "Section Rapid"],
  ["快速急行", "Rapid Express"],
  ["区間急行", "Section Express"],
  ["通勤急行", "Commuter Express"],
  ["各駅停車", "Local"],
  ["外回り", "outer loop"],
  ["内回り", "inner loop"],
  ["特急", "Limited Express"],
  ["急行", "Express"],
  ["準急", "Semi Express"],
  ["快速", "Rapid"],
  ["各停", "Local"],
  ["普通", "Local"],
];

/** Operator prefixes, longest first. */
const OPERATORS: Array<[string, string]> = [
  ["東京メトロ", "Tokyo Metro"],
  ["大阪メトロ", "Osaka Metro"],
  ["つくばエクスプレス", "Tsukuba Express"],
  ["りんかい線", "Rinkai Line"],
  ["ゆりかもめ", "Yurikamome"],
  ["東京モノレール", "Tokyo Monorail"],
  ["小田急", "Odakyu"],
  ["京王", "Keio"],
  ["東急", "Tokyu"],
  ["都営", "Toei"],
  ["西武", "Seibu"],
  ["東武", "Tobu"],
  ["京成", "Keisei"],
  ["京急", "Keikyu"],
  ["相鉄", "Sotetsu"],
  ["阪急", "Hankyu"],
  ["阪神", "Hanshin"],
  ["京阪", "Keihan"],
  ["近鉄", "Kintetsu"],
  ["南海", "Nankai"],
  ["名鉄", "Meitetsu"],
  ["JR", "JR"],
];

/** Line names without their operator and the trailing "線". */
const LINES: Record<string, string> = {
  // JR East (Tokyo area)
  山手: "Yamanote", 中央: "Chuo", 中央総武: "Chuo-Sobu", 総武: "Sobu", 京浜東北: "Keihin-Tohoku", 埼京: "Saikyo",
  湘南新宿ライン: "Shonan-Shinjuku", 上野東京ライン: "Ueno-Tokyo", 東海道: "Tokaido", 横須賀: "Yokosuka", 京葉: "Keiyo",
  常磐: "Joban", 武蔵野: "Musashino", 南武: "Nambu", 横浜: "Yokohama", 青梅: "Ome", 五日市: "Itsukaichi",
  宇都宮: "Utsunomiya", 高崎: "Takasaki", 根岸: "Negishi", 八高: "Hachiko", 川越: "Kawagoe", 鶴見: "Tsurumi",
  // JR West (Osaka area)
  大阪環状: "Osaka Loop", 京都: "Kyoto", 神戸: "Kobe", 東西: "Tozai", 学研都市: "Gakkentoshi", 阪和: "Hanwa", 大和路: "Yamatoji",
  // Tokyo Metro
  銀座: "Ginza", 丸ノ内: "Marunouchi", 日比谷: "Hibiya", 千代田: "Chiyoda", 有楽町: "Yurakucho",
  半蔵門: "Hanzomon", 南北: "Namboku", 副都心: "Fukutoshin",
  // Toei
  浅草: "Asakusa", 三田: "Mita", 新宿: "Shinjuku", 大江戸: "Oedo",
  // Private railways
  井の頭: "Inokashira", 相模原: "Sagamihara", 高尾: "Takao", 小田原: "Odawara", 江ノ島: "Enoshima", 多摩: "Tama",
  東横: "Toyoko", 田園都市: "Den-en-toshi", 目黒: "Meguro", 大井町: "Oimachi", 池上: "Ikegami", 世田谷: "Setagaya",
  池袋: "Ikebukuro", 拝島: "Haijima", 東上: "Tojo", 伊勢崎: "Isesaki", スカイツリーライン: "Skytree", 本: "Main",
  // Osaka Metro
  御堂筋: "Midosuji", 谷町: "Tanimachi", 四つ橋: "Yotsubashi", 堺筋: "Sakaisuji", 長堀鶴見緑地: "Nagahori Tsurumi-ryokuchi",
};

function stripPrefix(text: string, prefixes: Array<[string, string]>): [english: string | null, rest: string] {
  for (const [japanese, english] of prefixes) {
    if (text.startsWith(japanese)) return [english, text.slice(japanese.length)];
  }
  return [null, text];
}

function stripSuffix(text: string): [english: string | null, rest: string] {
  for (const [japanese, english] of SERVICES) {
    if (text.endsWith(japanese)) return [english, text.slice(0, -japanese.length)];
  }
  return [null, text];
}

const KANA_ONLY = /^[぀-ヿー]+$/;

/** English line name, or the original Japanese if the line isn't recognised. */
export function lineNameEn(lineName: string): string {
  // "ＪＲ山手線外回り・新宿・池袋方面": the part before "・" is the line; full-width letters → ASCII.
  const base = lineName.split("・")[0].normalize("NFKC").trim();
  const [service, withoutService] = stripSuffix(base);

  // "JR新幹線のぞみ" → "Shinkansen Nozomi"
  const shinkansen = withoutService.match(/^(?:JR)?新幹線(.*)$/);
  if (shinkansen) {
    const train = shinkansen[1];
    return ["Shinkansen", KANA_ONLY.test(train) ? kanaToRomaji(train) : ""].filter(Boolean).join(" ");
  }

  const [operator, rest] = stripPrefix(withoutService, OPERATORS);
  const core = rest.replace(/線$/, "");
  let name: string | null;
  if (!core) {
    // The operator is the line: "京王線" → "Keio Line", "ゆりかもめ" → "Yurikamome".
    name = !operator || operator === "JR" ? null : /(Line|Express|Monorail|Yurikamome)$/.test(operator) ? operator : `${operator} Line`;
  } else {
    const line = LINES[core] ?? (KANA_ONLY.test(core) ? kanaToRomaji(core) : null);
    name = line ? [operator, `${line} Line`].filter(Boolean).join(" ") : null;
  }
  if (!name) return lineName.split("・")[0];
  if (!service) return name;
  return service === "outer loop" || service === "inner loop" ? `${name} (${service})` : `${name} ${service}`;
}
