# Too Hard

A cross-platform React Native app for running a 75-day challenge (75 Hard and two
lighter variants). Everything lives on the device: no account, no backend, no sync.

> The point of the challenge is that the rules are not negotiable. The point of this
> codebase is that the rules live in one place — the domain layer — and every other
> layer is replaceable around them.

## Stack

| Concern | Choice |
| --- | --- |
| Runtime | Expo SDK 57 / React Native 0.86 / React 19 |
| Language | TypeScript (strict, no unused locals/params, path aliases) |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| State | Zustand (vanilla stores, injected — never module singletons) |
| Persistence | AsyncStorage behind a `KeyValueStore` port, Zod-validated |
| Media / system | expo-image-picker, expo-file-system, expo-notifications, expo-haptics |
| Testing | Jest (jest-expo) + React Native Testing Library 14 |
| Quality | ESLint flat config (incl. layer-boundary rules) + Prettier |

## Getting started

```bash
npm install
npx nx start              # Expo dev server; press i / a, or scan with Expo Go
npx nx ios                # or: npx nx android
```

Every task is an Nx target, so one command runs all the quality gates — and
re-runs are cached, so an unchanged check takes milliseconds rather than seconds:

```bash
npx nx verify             # typecheck + lint + test, cached
npx nx typecheck          # tsc --noEmit
npx nx lint               # eslint, zero warnings allowed
npx nx test               # 29 tests: domain, application, stores, full-app render
npx nx bundle             # prove it still bundles, without opening a simulator
npx nx show project toohard --web   # every target, in a browser
```

`npx nx ios` boots a simulator itself before handing over to Expo. Expo installs
Expo Go with `xcrun simctl install`, which fails with *"Unable to lookup in current
state: Shutdown"* when no device is booted, so [`scripts/run-ios.mjs`](scripts/run-ios.mjs)
boots the newest available iPhone runtime and waits until it really reports `Booted`.
Pick a specific device with `npx nx ios --device "iPhone 17 Pro"` or `IOS_SIMULATOR=…`.

The plain npm scripts still work (`npm start`, `npm test`, `npm run verify`) — Nx
wraps them rather than replacing them, and nothing was restructured to add it.
Editing a `.md` file does not invalidate the cache, so docs churn never costs a
re-run. In VS Code, `.vscode/tasks.json` exposes the same commands: **⇧⌘B** runs
`verify`, and the Nx Console extension lists every target in the sidebar.

## Architecture

Clean/hexagonal architecture. Dependencies point **inwards only**; the arrows below are
the only ones that exist, and ESLint fails the build if a file draws a new one.

```
┌──────────────────────────────────────────────────────────────┐
│ presentation/   screens · components · zustand stores · theme │
│                 renders DTOs, dispatches use cases            │
└───────────────┬──────────────────────────────────────────────┘
                │ calls
┌───────────────▼──────────────────────────────────────────────┐
│ application/   use cases (one intention = one object)         │
│                view mappers (entities → read models)          │
└───────────────┬──────────────────────────────────────────────┘
                │ depends on interfaces
┌───────────────▼──────────────────────────────────────────────┐
│ domain/        entities · value objects · strategies          │
│                specifications · policies · PORTS              │
└───────────────▲──────────────────────────────────────────────┘
                │ implements
┌───────────────┴──────────────────────────────────────────────┐
│ infrastructure/ AsyncStorage · expo-* adapters · mappers      │
└──────────────────────────────────────────────────────────────┘
                ▲
                │ wires everything, exactly once
        di/createContainer.ts  ← the only file that knows every concrete class
```

```
src/
├── core/            Result, AppError, EventBus, Logger — framework-free shared kernel
├── domain/          The rules. No React, no Expo, no storage.
│   ├── challenge/   Challenge + DailyLog entities, programmes, policies, specifications
│   ├── tasks/       Task definitions and one strategy per task kind
│   ├── ports/       Clock, repositories, photo/reminder/haptics interfaces
│   └── value-objects/ CalendarDate, DayNumber
├── application/     Use cases, DTOs (read models), ChallengeContextService
├── infrastructure/  Adapters: AsyncStorage, Zod schemas, expo-file-system, notifications…
├── di/              Composition root + React provider
└── presentation/    Navigation, screens, components, stores, theme
```

## Design patterns, and why each one is here

| Pattern | Where | Why it earns its place |
| --- | --- | --- |
| **Ports & adapters** | [`domain/ports/`](src/domain/ports/), [`infrastructure/`](src/infrastructure/) | Business rules never import Expo, so they run in a plain Node test in milliseconds. |
| **Repository** | [`Repositories.ts`](src/domain/ports/Repositories.ts), [`PersistentDailyLogRepository.ts`](src/infrastructure/persistence/PersistentDailyLogRepository.ts) | Swapping AsyncStorage for SQLite or a sync backend is one new class. |
| **Strategy** | [`tasks/strategies/`](src/domain/tasks/strategies/) | A checkbox, a counter and a photo behave differently. One class each, no `switch` scattered across screens. |
| **Strategy (again)** | [`policies/FailurePolicy.ts`](src/domain/challenge/policies/FailurePolicy.ts) | "Miss a day → restart at day 1" vs "miss a day → carry on" is the only difference between 75 Hard and 75 Soft. |
| **Specification** | [`specifications/`](src/domain/challenge/specifications/) | "This day is complete" is a named, composable, unit-tested object — not an `if` buried in a component. |
| **Command** | [`application/use-cases/`](src/application/use-cases/) | Every user intention is one object with one `execute`. Screens orchestrate nothing. |
| **Registry + Factory** | [`TaskStrategyRegistry.ts`](src/domain/tasks/TaskStrategyRegistry.ts) | Resolves a strategy by kind; adding a kind means registering, not editing. |
| **Data Mapper** | [`persistence/mappers.ts`](src/infrastructure/persistence/mappers.ts) | Entities stay ignorant of their stored shape, so a schema change never leaks inward. |
| **Observer** | [`core/events/EventBus.ts`](src/core/events/EventBus.ts) | Haptics, logging and (later) analytics react to `day/completed`. The use case that publishes it knows none of them. |
| **Result type** | [`core/result/Result.ts`](src/core/result/Result.ts) | Failure is a value with a type, not an exception thrown across four layers. |
| **Dependency injection** | [`di/createContainer.ts`](src/di/createContainer.ts) | Constructor injection everywhere; tests build the same app from in-memory doubles. |
| **Read models / DTOs** | [`application/dto/`](src/application/dto/) | Components render `DashboardView`, never an entity — so persistence changes cannot ripple into JSX. |

## How a tap becomes state

```
TaskCard onPress
  → challengeStore.sendTaskCommand(taskId, { type: 'toggle' })
    → UpdateTaskProgressUseCase.execute
      → ChallengeContextService loads challenge + programme + today's log
      → DailyLogs.applyInput delegates the transition to the task's Strategy
      → DayCompleteSpecification decides whether the day just closed
      → DailyLogRepository.save
      → EventBus publishes day/taskUpdated (+ day/completed) → haptics fire
    → returns a fresh DashboardView
  → store swaps in the new view model → screens re-render
```

## The rules it enforces

- Six daily tasks for 75 Hard: diet, indoor workout, outdoor workout, 3.8 L of water,
  10 pages of non-fiction, progress photo.
- **Only today is editable.** Past days are locked — back-filling yesterday would turn
  the streak into a story rather than a record.
- A day is *missed* only once it is in the past and still incomplete. Today is never missed.
- On a missed day, the programme's failure policy decides: 75 Hard restarts at day 1
  (keeping the failed attempt in history), 75 Soft records the miss and carries on.
- Day rollover is re-evaluated on launch and whenever the app returns to the foreground,
  so midnight passing in the background cannot leave a stale "day 12" on screen.
- Progress photos are copied out of the picker's cache into the document directory —
  otherwise a day-60 photo would quietly vanish when the OS reclaims the cache.

## Testing

```
__tests__/
├── domain/        value objects, strategies, specifications — pure and fast
├── application/   full lifecycles against in-memory ports and a FixedClock
├── presentation/  one render test that drives onboarding → day 1 through the real app
└── support/       the harness: a container with every port replaced by a double
```

The harness in [`__tests__/support/harness.ts`](__tests__/support/harness.ts) builds the
real container with fakes, so tests exercise production wiring rather than a parallel
universe. `FixedClock` makes "75 days later" an instant assertion.

## Extending it

**A new task kind** (a timed activity, a GPS-verified run):
1. Add its variant to `TaskDefinition` / `TaskProgress` in [`domain/tasks/Task.ts`](src/domain/tasks/Task.ts).
2. Write a strategy in [`domain/tasks/strategies/`](src/domain/tasks/strategies/) and register it.
3. Add one branch to [`TaskCard.tsx`](src/presentation/components/TaskCard.tsx).

Nothing else changes — not the entities, not the use cases, not persistence.

**A new programme**: add a `ChallengeProgram` to the catalogue in
[`ChallengeProgram.ts`](src/domain/challenge/ChallengeProgram.ts). It appears in
onboarding automatically.

**Cloud sync**: implement the three repository ports against your API and swap them in
`createContainer`. No other file needs to know — see [`docs/database.md`](docs/database.md)
for a full walkthrough of four concrete options (local SQLite, Supabase, Firestore, a custom
API), with the trade-offs and a recommendation.

For a broader menu of where the app could go next — features, infrastructure, what it takes
to actually ship this to a store — see [`docs/roadmap.md`](docs/roadmap.md).

## Known gaps

- Local-only: no sync, no export, no backup. See [`docs/database.md`](docs/database.md) if
  you want to change that.
- Photos are referenced by URI; there is no gallery or before/after comparison screen yet
  (see `docs/roadmap.md`'s "Quick wins").
- Push notifications need a development build on Android (Expo Go dropped remote push in
  SDK 53); the local daily reminder works everywhere. The splash screen's native fade
  transition is similarly unavailable in Expo Go — see `AppSplash.tsx`.
- No migration runner yet — `SCHEMA_VERSION` and the envelope in
  [`JsonDocument.ts`](src/infrastructure/persistence/JsonDocument.ts) are the hook for one.

## Troubleshooting

**`simctl install … exited with non-zero code: 149` / "Unable to lookup in current
state: Shutdown"** — no simulator was booted when Expo tried to install Expo Go. Use
`npx nx ios`, which boots one first. To do it by hand:

```bash
xcrun simctl list devices available   # pick a UDID on a current runtime
xcrun simctl boot <UDID> && open -a Simulator
```

Stale simulator state can also be cleared with `xcrun simctl shutdown all` followed by
a fresh boot.

**Metro serves an old bundle** — `npx expo start --clear`.
