# Working in this repo

## Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any
code that touches an `expo-*` package. APIs moved in recent SDKs — notably
`expo-file-system` (now `File` / `Directory` / `Paths`) and `expo-notifications`.

## Architecture rules

Clean architecture; dependencies point inwards only. See `README.md` for the full map.

- `src/domain/**` must not import React, React Native, Expo, or any outer layer.
- `src/application/**` depends on domain ports only — never on `infrastructure`, `di` or
  `presentation`.
- `src/infrastructure/**` implements ports; it never reaches into `presentation` or `di`.
- `src/di/createContainer.ts` is the only file allowed to name every concrete class.

These are enforced by `no-restricted-imports` in `eslint.config.js`. If a rule blocks you,
the design is wrong, not the rule.

## Conventions

- Fallible operations return `Result<T, AppError>`; exceptions are for programmer errors.
- Entities are immutable records with behaviour in pure functions (`Challenges`, `DailyLogs`).
- Screens render DTOs from `application/dto`, never entities.
- Nothing calls `new Date()` outside `SystemClock`; inject the `Clock` port.
- New business rules belong in a specification, strategy or policy — not in a component.

## Before finishing

```bash
npx nx verify   # typecheck + lint + test (cached; equivalent npm scripts also work)
```
