# LastRide

**LastRide (帰り時) tells people out at night in Japan when they need to start
walking to catch the last train home — and what to do if they miss it.**

Set your home station once. From then on the app finds the stations near you,
works out the walking time to each, looks up tonight's last train home from
each one, and shows a single leave-by time: the last train's departure minus
the walk minus a few minutes to get from the entrance to the platform. As you
move during the evening the plan follows you, and reminders are rescheduled.

- **Leave screen** — leave-by time, a live countdown, the route home (lines,
  transfers, arrival, fare), and the other nearby stations, any of which you can
  switch to for the night.
- **Reminders** — at the intervals you choose before leave-by, again when it's
  time to go, and once more just after the last train has gone, in case you
  missed it. They run while night-out tracking is on, which switches itself off
  once the night's alerts are done.
- **If missed** — the first train and its route, a taxi estimate with regional
  late-night rates, walking home when it's close, and net cafés, karaoke,
  capsule hotels and hotels nearby, compared by what you'd pay and when you'd
  get home.
- Japanese and English throughout, including romanized station and line names.

Times come from [駅すぱあと API](https://api-info.ekispert.com/) (real
timetables, including weekends and holidays) and stations, walking routes, taxi
estimates and places from [NAVITIME](https://api-sdk.navitime.co.jp/api/) via
RapidAPI. Both are called by the API server in this repo, never by the app, so
the keys stay off people's phones and answers are cached. Without a server the
app falls back to free OpenStreetMap services and clearly-labelled sample train
times.

**Layout:** `artifacts/last-ride` is the Expo (React Native) app,
`artifacts/api-server` the Express API server, and `lib/` holds the OpenAPI spec
plus the client and validators generated from it. See `replit.md` for how to run
everything and which environment variables are needed.

## Tests

```bash
pnpm run typecheck   # libraries and apps
pnpm run test        # unit tests (Vitest)
```

Both run in CI on every push and pull request.

`artifacts/last-ride/tests/` covers the app's pure logic — no React Native
components are rendered, these are plain functions run in Node.

- **`time.test.ts`** — the Japan-time helpers. JST is treated as UTC+9 whatever
  the device is set to, and the rail service day starts at 04:00, so a 00:31
  train belongs to the previous evening.
- **`planner.test.ts`** — the night plan. The five `rideStatus` states and the
  exact boundaries between them, the reminder schedule, and the backstops that
  end the night (the last train counts as gone by 01:30, tracking stops by
  04:00, the night is over by 05:00).

Several rules tested there are product decisions that otherwise live only in
comments: the 3-minute station buffer, the 30-minute warning, and the 10
minutes a farther station must save to be worth a longer walk. The tests exist
so those cannot change by accident.

`@/lib/api` is stubbed under Vitest (`tests/stubs/api.ts`) because the real
module imports `react-native` at load time, which Vite cannot parse. Nothing
under test makes a request. See `vitest.config.ts`.
