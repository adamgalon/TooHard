# Where this could go next

A menu, not a plan — pick what's actually interesting rather than working
top to bottom. Each item notes roughly how big a change it is against the
current architecture, and links back to what makes it easy or hard given
what's already built.

## Quick wins (small, self-contained, no architecture change)

- **Photo timeline.** All progress photos across an attempt, laid out as a
  grid or a before/after slider. The photos already exist on disk
  (`ExpoPhotoStorage`) and every `DailyLog` already references one — this is
  a new screen and a new `GetPhotoTimelineUseCase`, nothing else moves.
- **Share card.** Render "Day 75. Done." (or day 12, streak 8, whatever) as
  an image and hand it to the OS share sheet — `react-native-view-shot` on
  a screen you already have. Good, cheap virality for something people are
  already proud of.
- **CSV/JSON export.** A `GetStatisticsUseCase`-adjacent use case that
  serializes every `DailyLog` for the people who want their data in a
  spreadsheet. Ties naturally to `expo-sharing`.
- **Localization.** The app is English-only. `AppText` and the screens are
  centralized enough that wiring in `expo-localization` + a translation
  library and extracting strings is mechanical, if tedious — no design
  pattern changes needed, just discipline.
- **Editable reminder copy / multiple reminders.** `ReminderScheduler`
  already exists; it currently schedules exactly one. Extending it to a
  list is a small port change, not a new concept.

## Habit-loop features (medium — new use cases, same architecture)

- **Home screen widget.** iOS `WidgetKit` / Android App Widgets showing
  today's ring and streak without opening the app. This is the single
  highest-leverage feature for a habit-formation app — friction removed
  is retention gained. Needs a native module (`expo-glance`-style, or a
  config plugin) since widgets render outside the RN tree; the *data* side
  is trivial (`GetDashboardUseCase` already returns exactly what a widget
  needs).
- **Apple Health / Google Fit integration.** Auto-satisfy the workout task
  from a detected workout, log water from Health. This is a new
  `TaskStrategy`-adjacent idea: a task that can be satisfied by an external
  signal, not just a manual tap. Fits the existing Strategy pattern well —
  it's a new *source* of task input, not a new architecture.
- **Custom programmes.** Let a user define their own task list instead of
  picking from the three built-in ones. `ChallengeProgram` is already just
  data (see [`ChallengeProgram.ts`](../src/domain/challenge/ChallengeProgram.ts))
  — this is a "programme builder" screen that produces the same shape,
  plus persisting user-authored programmes somewhere (AsyncStorage today,
  a table if you do the database work).
- **Richer stats.** A heatmap across *every* attempt ever, not just the
  current one (today's `GetStatisticsUseCase` only looks at the active
  attempt's logs) — "you complete the water task 40% less often on
  weekends" style insights. Pure read-model work in `application/`, no
  domain change.
- **Smarter reminders.** "You haven't logged water since 2pm" instead of
  one fixed evening ping — needs a background task (`expo-task-manager`) to
  periodically check dashboard state, not just a scheduled notification.

## Bigger bets (real architecture decisions)

- **A real database, with sync.** Covered in depth in
  [`database.md`](./database.md) — this is the one every other "connect it
  to a backend" idea depends on. Read that doc first; the short version is
  it also means designing auth, which this app has none of today.
- **Multiple concurrent challenges.** Right now there is exactly one active
  `Challenge` per device (`ChallengeRepository.find()` returns "the"
  challenge, singular). Running 75 Hard and a separate "Dry January" at
  once means `find()` becomes `list()`, every use case takes a
  `challengeId`, and the dashboard becomes a chooser over N challenges
  instead of assuming one. Genuinely a different shape, not a small change
  — worth wanting on purpose, not backing into.
- **Accountability / social.** A partner sees your streak, or gets pinged
  if you miss a day. Needs the database + auth work as a prerequisite, and
  — like the database question — directly contradicts the app's current
  "no leaderboard" promise in Settings. Decide the philosophy before the
  implementation.
- **Apple Watch companion.** Quick task check-off from the wrist. Its own
  target, its own (much smaller) UI, sharing the domain/application layers
  conceptually but not the code directly — watchOS doesn't run RN.

## Making it a real, distributable app

None of this is done yet, and all of it is a prerequisite for anyone but
you running the app:

- **A CI pipeline.** Nothing currently runs `nx verify` except your own
  discipline. A GitHub Actions workflow that runs it on every push/PR is
  maybe twenty minutes of work and would have caught real things earlier
  in this project (see `docs/database.md`'s "what the tests caught" energy
  — the same value, automated).
- **EAS Build + TestFlight / Play internal testing.** Today the app only
  runs via Expo Go or a local simulator build. Getting a real `.ipa`/`.aab`
  onto a device that isn't plugged into this Mac needs an Expo account and
  `eas build` — there's a dedicated skill for this (`eas-app-stores`) when
  you're ready.
- **Crash and error reporting.** `ConsoleLogger` is the only thing that
  sees errors today, and only while a debugger is attached. `Sentry`'s
  Expo integration is a small addition to `di/createContainer.ts` — swap
  `ConsoleLogger` for a `SentryLogger` implementing the same `Logger`
  interface, same pattern as every other adapter in this codebase.
- **Privacy policy + store listing.** Required the moment this touches
  App Store Connect, and required *honestly* the moment analytics or a
  backend exist — "no account, no sync" currently means you don't need one.
- **Analytics**, if you want to know how people actually use it. Worth the
  same explicit, on-purpose decision as the database question — this app's
  entire pitch right now is "nothing leaves your device."

## If you want a suggested order

1. **CI pipeline** — cheap, and it protects everything after it.
2. **Photo timeline + share card** — genuinely nice, no architecture risk,
   fast to see finished.
3. **Decide the database/auth/social question as one decision**, since they're
   coupled — then do `docs/database.md`'s Path B or C.
4. **Widget** — the highest-leverage feature for actually keeping people
   on the challenge, once you're not fighting the questions above.
