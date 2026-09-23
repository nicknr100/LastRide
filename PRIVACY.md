# LastRide Privacy Policy

_Last updated: 23 September 2026_

LastRide (帰り時) helps you catch the last train home. To do that it needs to
know where you are and where you are going. This policy explains exactly what
that means, in plain terms.

**We do not ask you to create an account, and we do not sell your data or use it
for advertising.**

## What the app collects

| What | Why | Where it goes |
| --- | --- | --- |
| **Your location** (GPS coordinates) | To find the stations near you and how long it takes to walk to them | Sent to our API server, and from there to our transit data providers |
| **Your home station** (and home address, if you add one) | To look up the last train that takes you home, and to estimate a taxi fare | Stored on your phone; the coordinates are sent with timetable and taxi lookups |
| **Your settings** — language, walking pace, reminder times | To make the plan match how you actually travel | Stored on your phone only |

The app does **not** collect your name, email address, phone number, contacts,
photos or payment details, because it never asks for them.

## When your location is used

- **While the app is open**, to work out your leave-by time.
- **While "night-out tracking" is on**, also in the background, so your plan and
  reminders keep up as you move. Tracking is off unless you switch it on, and it
  switches itself off automatically once the night's last reminder has been sent
  (by 04:00 at the latest).

You can revoke location access at any time in your phone's settings. The app
still works, but it can no longer work out which station you are near.

## Who else sees it

To provide train times and nearby places, coordinates and station names are sent
to:

- **駅すぱあと API (Val Laboratory Co., Ltd.)** — train timetables, fares and routes.
- **NAVITIME JAPAN Co., Ltd.** (via RapidAPI) — nearby stations, walking and
  driving routes, and places such as cafés and hotels.
- **OpenStreetMap services** — used only as a fallback when the above are
  unavailable.

They receive location data needed to answer a query. They do not receive your
identity, because the app has none to give.

## How long it is kept

- **On your phone:** your settings, home station and most recent plan stay until
  you delete them with **Reset & start over** in Settings, or uninstall the app.
- **On our server:** answers to queries are cached for up to 24 hours to avoid
  repeating paid lookups. Cached entries are keyed by an approximate location
  (rounded to roughly a 100-metre grid), never by a user, and there are no user
  accounts to link them to. We also keep a count of how many requests were made
  to each provider, which contains no location data.
- **Server logs** record which endpoint was called and the response status. They
  do not record query strings, so they do not contain coordinates or API keys.

## Your choices

- **Reset & start over** (Settings) erases your language, home station and
  settings from the phone.
- **Uninstalling** the app removes everything stored on the phone.
- **Turning off location permission** stops all location use.

Because there is no account, there is nothing to identify you by, so we cannot
look up or delete "your" server-side data — there is none that is tied to you.

## Children

LastRide is not directed at children under 13 and does not knowingly collect
their data.

## Changes

If this policy changes, the updated version will be published here with a new
date at the top.

## Contact

Questions about this policy: **[add your contact email]**
