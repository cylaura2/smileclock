# SmileClock 🦷⏱

A simple mobile app to track how long you wear your Invisalign (or any clear aligners) each day.

## Features

- **One-tap toggle** — big button to mark aligners **in** or **out**, with a live session timer.
- **Daily progress ring** — see today's total wear time against your goal (default 22 h/day) at a glance.
- **Calendar heatmap** — every day is color-coded by how close you got to your goal, with the hours worn shown on each cell. Includes a monthly average and "days hit goal" count.
- **Smart reminders** — if your aligners are out longer than your threshold (default 30 min), you get a notification to put them back in. The reminder is cancelled automatically when you pop them back in.
- **Tray tracking** — track which aligner tray you're on and how many days are left before switching to the next one.

All data is stored locally on your phone — no account, no backend.

## Run it on your iPhone

1. Install **Expo Go** from the App Store.
2. In this folder, start the dev server:
   ```bash
   npm install      # first time only
   npx expo start
   ```
3. Scan the QR code in the terminal with your iPhone Camera and open it in Expo Go.

> Notifications work in Expo Go for local reminders. When you're ready to ship a standalone app to your phone (no Metro server needed), build with EAS: `npx eas build -p ios --profile preview`.

## Project layout

```
App.tsx                 root: providers, notification handler, tab bar
src/
  store.tsx             app state + persistence + actions
  storage.ts            AsyncStorage load/save
  types.ts              data model
  theme.ts              colors, spacing, heatmap scale
  utils/
    time.ts             wear-time math (sessions, daily minutes, formatting)
    notifications.ts    schedule/cancel reminder notifications
  components/           ProgressRing, Card, Stepper
  screens/              TodayScreen, CalendarScreen, SettingsScreen
```

## Note on Node version

Your Node is v20.18.0; React Native 0.85 prefers v20.19.4+. The dev server and bundler work fine, but if you hit odd issues, upgrade Node (e.g. `nvm install 20`).
