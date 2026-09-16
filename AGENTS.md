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

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
