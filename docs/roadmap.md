# Roadmap

What's planned after the 1.0 release (2026-11-07). Ideas stay in **Later** until they're picked up.

## Growth calendar

| When | What |
|---|---|
| 12/1 | 忘年会 Featuring nomination publishes (submitted 11/20, App Launch). |
| Now – early Dec | Press pitches: iPhone Mania, ITmedia Mobile, ASCII, k-tai Watch, Appliv. |
| 忘年会 weeks (Dec) | Apple Ads: exact match 終電 keywords, ¥1–2k a day, Thu–Sat. |
| Weekly | Short videos and photo slides (TikTok, Reels, Shorts, X). Quiz episodes use real app screenshots only. |
| By 12/15 | 新年会 Featuring nomination, ideally with an In-App Event tied to a real update (1.1). |
| By 3/01 | 歓送迎会 / 新歓 nomination. |
| Mid-March | ダイヤ改正: run the timetable refresh that day instead of waiting for the 1st/15th: `aws lambda invoke --function-name lastride-production-transit-refresh /dev/stdout` |

## Small fixes

- Premium card copy: 出発時刻 → 出る時刻 (出る is for the person, 発/出発 for trains).
- App Store description wording.
- Website contact form: deploy `infra/contact-worker` (Turnstile key, `CONTACT_TO`).
- Expo patch updates (`npx expo install --fix`) once releases are a day old.

## Later (v1.1 and after)

- **Several home stations per place.** A place can hold 2–3 nearby stations (e.g. two lines within walking distance). Each night the app plans to each, including the walk home, and uses the one that lets you leave latest, saying which it chose. Today each destination has one `homeStation` (`lib/settings.ts`, `app/home-station.tsx`, `planNight` in `lib/tracking.ts`). Cap the count (each station adds lookups and background re-plans). Possible Premium feature.
- **帰宅連絡.** Send a partner or parent your leave and arrival times automatically (times only, built like a 2-person group).
- **Station entrances.** Walk to the nearest entrance using OpenStreetMap entrances (`railway=subway_entrance` / `train_station_entrance`), optionally showing 「A2出口まで徒歩4分」. Credit OpenStreetMap in データとライセンス.
- **自動スタート.** Night tracking on a schedule (e.g. Fridays 20:00) or by location.
- **着せ替え.** Alternate app icons.
- **Paywall timing.** Ask after a first good night; seasonal offer codes (忘年会).
- **Business.** Company seats with a website admin (see `docs/enterprise-deployment.md`).

Safety features stay free: alarms, 1本前, early leave time, 乗れなかったら.

## Over-the-air updates

An update replaces the whole JS bundle, so publish from a commit that includes everything already shipped over the air. Before publishing, check the live update's commit:

```
eas update:list --branch production
eas update:view <group id> --json   # gitCommitHash
```

1.0 build 15 (iOS) has runtime `aca13523b1350e6e6047e55fb7addf0181df3f09`.
