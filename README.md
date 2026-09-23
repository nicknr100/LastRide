# LastRide

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
