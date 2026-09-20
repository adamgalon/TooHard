# Changelog

All notable changes to this project are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); entries are grouped by
feature rather than by individual commit.

## [Unreleased]

### Added

- Branch-protected `main` — changes land through a PR once the `verify` CI check
  passes, not through a direct push.
- Pre-commit (`lint-staged`), commit-message (`commitlint`), and pre-push
  (typecheck/lint/test) git hooks via Husky.
- Dependabot for dependency updates (dev tooling grouped; Expo/React Native
  packages excluded — those move together via `npx expo install`).
- CI badge, PR template, `CODEOWNERS`, and test-coverage reporting in CI.

### Fixed

- `LICENSE` incorrectly attributed copyright to Expo (a leftover from the
  `create-expo-app` template) instead of this project's author.

## [1.0.0] — 2026-09

Initial build of the app: clean/hexagonal architecture (domain → application →
infrastructure → presentation), the 75 Hard / 75 Medium / 75 Soft programmes,
task strategies, failure policies, and every core screen.

### Added

- Full challenge lifecycle: start, daily task tracking, restart/forgive
  policies, statistics, and the calendar wall.
- Animated boot splash and a designed icon/brand mark.
- **Backup & restore**: export all app data to a file via the OS share sheet
  and restore it back, with no account or backend.
- **Photo timeline**: a dedicated tab for progress photos, including a
  before/after comparison.
- Nx task running, a GitHub Actions CI pipeline (typecheck, lint, test,
  bundle export), and a growing Jest + React Native Testing Library suite.

### Fixed

- `expo-notifications` crashing on import on Android inside Expo Go — now
  loaded lazily so the failure surfaces as a normal `Result` error instead of
  crashing the app at boot.
- The iOS simulator boot race in `scripts/run-ios.mjs`, and Xcode license
  prompts now report as an actionable instruction instead of a bare failure.
