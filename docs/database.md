# Adding a database

This app currently stores everything in `AsyncStorage`, on one device, forever
local. This doc is about what changes if you want that to be different —
and, just as importantly, what *doesn't* have to change.

## Read this first: you already built the seam for this

Nothing in `domain/` or `application/` talks to AsyncStorage. They depend on
three interfaces in [`src/domain/ports/Repositories.ts`](../src/domain/ports/Repositories.ts):

```ts
export interface ChallengeRepository {
  find(): Promise<Result<Challenge | null>>;
  save(challenge: Challenge): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface DailyLogRepository {
  findByDate(query: DailyLogQuery & { date: CalendarDate }): Promise<Result<DailyLog | null>>;
  listForAttempt(query: DailyLogQuery): Promise<Result<DailyLog[]>>;
  save(log: DailyLog): Promise<Result<void>>;
  saveMany(logs: readonly DailyLog[]): Promise<Result<void>>;
  clear(): Promise<Result<void>>;
}

export interface SettingsRepository {
  load(): Promise<Result<AppSettings>>;
  save(settings: AppSettings): Promise<Result<void>>;
}
```

`PersistentChallengeRepository`, `PersistentDailyLogRepository` and
`PersistentSettingsRepository` in `src/infrastructure/persistence/` are just
*one* implementation of these — AsyncStorage plus a Zod-validated JSON
envelope ([`JsonDocument.ts`](../src/infrastructure/persistence/JsonDocument.ts)).
Swapping in a real database means writing a new class that implements the
same three interfaces and handing it to `createContainer` — nothing in
`src/domain/`, `src/application/`, or any screen changes. That's the whole
point of `di/createContainer.ts`'s `ContainerOverrides`:

```ts
// src/di/createContainer.ts
export interface ContainerOverrides {
  challenges?: ChallengeRepository;
  logs?: DailyLogRepository;
  settings?: SettingsRepository;
  // …
}
```

So the real work in every option below is: **write one class per
interface, validate what comes back with the existing Zod schemas, wire it
in.** The architecture already decided this would be easy; this doc is about
which backend to point it at.

## The question to answer before picking a technology

> **Are you solving "AsyncStorage isn't enough," or "I want this on more
> than one device"?**

These are different problems with different answers.

- If it's the first — you have years of daily logs, restarts, stats, and
  a single JSON blob read on every launch is starting to feel wasteful, or
  you want real SQL queries for a richer stats screen — you want **local
  SQLite**. No backend, no auth, no network. See [Path A](#path-a-sqlite-still-local-just-a-real-database).
- If it's the second — you want to open the app on your phone and your
  partner's phone and see the same streak, or you don't want a lost phone
  to mean a lost 60-day streak — you want a **networked, synced backend**.
  That means **you also need to design authentication**, which this app
  currently has none of. See [Path B](#path-b-supabase-postgres--auth--realtime) onward.

Worth saying plainly: the Settings screen currently tells the user *"Too
Hard keeps everything on your device. No account, no sync, no leaderboard —
the only person you are answering to is you."* Adding a networked backend
is not a technical footnote on that promise, it reverses it. That's a
product decision, not just an engineering one — decide it on purpose. (A
good middle ground: make sync opt-in — local-only by default, an explicit
"back up my streak" action for people who want it. Path B and C below both
support that shape.)

## Path A: SQLite, still local, just a real database

**Choose this if:** you want more room and real queries, but multi-device
sync isn't the goal (yet, or ever).

Use `expo-sqlite`, which is already SDK-aligned with everything else in this
project. Design a schema that mirrors the Zod records almost exactly:

```sql
create table challenges (
  id text primary key,
  program_id text not null,
  status text not null,
  start_date text not null,
  attempt integer not null,
  created_at text not null,
  completed_at text,
  previous_attempts text not null -- JSON array, same shape as AttemptSummary[]
);

create table daily_logs (
  id text primary key,
  challenge_id text not null,
  attempt integer not null,
  date text not null,
  day_number integer not null,
  status text not null,
  entries text not null, -- JSON object, same shape as Record<string, TaskProgress>
  note text,
  updated_at text not null
);
create index daily_logs_lookup on daily_logs (challenge_id, attempt, date);
```

Then:

```ts
// src/infrastructure/persistence/SqliteDailyLogRepository.ts
import * as SQLite from 'expo-sqlite';
import { dailyLogSchema } from './schemas';
import { DailyLogMapper } from './mappers';
import type { DailyLogRepository, DailyLogQuery } from '@domain/ports/Repositories';

export class SqliteDailyLogRepository implements DailyLogRepository {
  constructor(private readonly db: SQLite.SQLiteDatabase) {}

  async listForAttempt(query: DailyLogQuery) {
    const rows = await this.db.getAllAsync(
      'select * from daily_logs where challenge_id = ? and attempt = ? order by date asc',
      [query.challengeId, query.attempt],
    );
    // Parse each row's JSON columns back out, validate with dailyLogSchema
    // (same pattern as JsonDocument.read), map with DailyLogMapper.toDomain.
    // Return ok([...]) or err(AppErrors.corrupted(...)) exactly like today.
  }
  // findByDate / save / saveMany / clear follow the same shape.
}
```

The Zod schemas and mappers you already have in
`src/infrastructure/persistence/schemas.ts` and `mappers.ts` don't change —
you're still validating "does this look like a `DailyLog`," you're just
reading the raw object from a SQLite row instead of a JSON blob.

**Effort:** small. **Risk:** low. **What it doesn't give you:** anything on
a second device.

## Path B: Supabase (Postgres + auth + realtime)

**Choose this if:** you want multi-device sync, and you'd rather write SQL
and get auth "for free" than run your own server.

This is the option I'd actually pick first for this app. Reasons:

- Its tables map almost directly onto your existing Zod schemas — it's
  relational, and your data already *is* relational (one challenge has many
  daily logs).
- **Row-level security** gives you "each user only ever sees their own
  rows" as a database-enforced guarantee, not an application-layer promise
  you have to get right in every query.
- Auth (email, magic link, Apple/Google sign-in) is a few SDK calls, not a
  service you build.
- The free tier is genuinely enough for this app's scale.

### Schema

```sql
create table challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  program_id text not null,
  status text not null check (status in ('active','completed','abandoned')),
  start_date date not null,
  attempt integer not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  previous_attempts jsonb not null default '[]'
);

create table daily_logs (
  id text primary key, -- keep DailyLogIds.compose(challengeId, date) as-is
  challenge_id uuid not null references challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  attempt integer not null,
  date date not null,
  day_number integer not null,
  status text not null check (status in ('pending','completed','missed')),
  entries jsonb not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (challenge_id, attempt, date)
);

alter table challenges enable row level security;
alter table daily_logs enable row level security;

create policy "own rows only" on challenges
  for all using (auth.uid() = user_id);
create policy "own rows only" on daily_logs
  for all using (auth.uid() = user_id);
```

### The repository

```ts
// src/infrastructure/persistence/SupabaseChallengeRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppErrors } from '@core/errors/AppError';
import { err, fromPromise, map, ok, type Result } from '@core/result/Result';
import type { Challenge } from '@domain/challenge/Challenge';
import type { ChallengeRepository } from '@domain/ports/Repositories';
import { ChallengeMapper } from './mappers';
import { challengeSchema } from './schemas';

export class SupabaseChallengeRepository implements ChallengeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async find(): Promise<Result<Challenge | null>> {
    const { data, error } = await this.client
      .from('challenges')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return err(AppErrors.storageRead(error.message, { cause: error }));
    if (!data) return ok(null);

    const validated = challengeSchema.safeParse(toRecordShape(data));
    if (!validated.success) {
      return err(AppErrors.corrupted('Server returned an unexpected challenge shape.'));
    }
    return ok(ChallengeMapper.toDomain(validated.data));
  }

  async save(challenge: Challenge): Promise<Result<void>> {
    const record = ChallengeMapper.toRecord(challenge);
    // fromPromise already resolves to Result<T, AppError> — map it down to
    // Result<void, AppError> rather than chaining .then(() => ok(undefined)),
    // which would silently discard a real failure and always report success.
    const result = await fromPromise(
      this.client.from('challenges').upsert(fromRecordShape(record)).throwOnError(),
      (cause) => AppErrors.storageWrite('Could not save the challenge.', { cause }),
    );
    return map(result, () => undefined);
  }

  async clear(): Promise<Result<void>> {
    const result = await fromPromise(
      this.client.from('challenges').delete().neq('id', '').throwOnError(),
      (cause) => AppErrors.storageWrite('Could not clear challenges.', { cause }),
    );
    return map(result, () => undefined);
  }
}

// toRecordShape/fromRecordShape: translate between your camelCase
// ChallengeRecord and Postgres's snake_case columns (or configure
// Supabase's client to do this for you). Skipped here for brevity.
```

`SupabaseDailyLogRepository` and `SupabaseSettingsRepository` follow the
same shape — validate what comes back with the existing schemas, map with
the existing mappers, translate errors into `AppError` the same way every
adapter in this codebase already does.

### Wiring it in

```ts
// wherever you build the container for a signed-in user
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true },
});

const container = createContainer({
  challenges: new SupabaseChallengeRepository(supabase),
  logs: new SupabaseDailyLogRepository(supabase),
  settings: new SupabaseSettingsRepository(supabase),
});
```

That's it — `StartChallengeUseCase`, `SynchronizeChallengeUseCase`, every
screen, every store: unchanged. This is exactly what `ContainerOverrides`
was built for.

**What Supabase does *not* give you automatically:** offline support. Its
client is online-first — a `save()` call while offline just fails today. If
this app's offline-first character matters to you (it currently works with
airplane mode on, which is a real, deliberate feature — day 47 in a
basement gym with no signal still has to count), you'd want to either queue
writes locally and flush on reconnect yourself, or look at Supabase's
[PowerSync](https://www.powersync.com/) integration, which adds a local
SQLite cache with sync — effectively Path A and B combined.

## Path C: Firebase / Firestore

**Choose this if:** offline-first matters as much as sync does, and you'd
rather not write SQL.

Firestore's client SDK has offline persistence *built in* — reads and
writes work with no connection and sync automatically when one returns,
which is the closest drop-in match to what AsyncStorage already gives you
for free today. The trade-off is NoSQL: no joins, no row-level-security
policies (you write [security rules](https://firebase.google.com/docs/firestore/security/get-started)
instead, similar idea, different syntax), and Google's ecosystem rather
than Postgres's.

Shape: one `challenges/{challengeId}` document per challenge (owned by
`request.auth.uid`), one `dailyLogs/{logId}` collection alongside it. The
repository implementations look structurally identical to the Supabase ones
above — `onSnapshot`/`getDoc`/`setDoc` instead of `.select()`/`.upsert()`,
same validate-with-Zod, map-with-the-existing-mapper, translate-errors
pattern.

## Path D: your own backend

**Choose this if:** you want full control, or you're building this as part
of something bigger than one app.

A small [Hono](https://hono.dev/) or [tRPC](https://trpc.io/) API in front
of Postgres, deployed anywhere (Fly.io, Railway, a Raspberry Pi). More work
than B or C — you're building the auth, the row-level security equivalent,
and the API — but nothing about the *client-side* shape changes: you'd
still write one `HttpChallengeRepository implements ChallengeRepository`
that calls `fetch()` instead of a database client, validated and mapped the
same way as every other adapter in this file.

## Migrating what's already on the device

Whichever path you pick, existing users have real data sitting in
AsyncStorage that a new backend won't know about. The seam for this already
exists: [`JsonDocument.ts`](../src/infrastructure/persistence/JsonDocument.ts)
wraps every stored value in `{ version, data }` and `SCHEMA_VERSION` is
already exported from `schemas.ts` specifically so a shape change has
somewhere to hook a migration. A one-time "on first launch after this
update, read the old `PersistentChallengeRepository`, write it to the new
one, then stop using the old one" step is a single `MigrateToBackendUseCase`
— same `Result`-returning, dependency-injected shape as everything else in
`application/use-cases/`.

## Recommendation, concretely

If you're building this for yourself and a handful of people who'd use it:
**Path B (Supabase)**. It gets you auth and sync fastest, the relational
shape fits your data, and row-level security means you don't have to get
"can user X see user Y's data" right by hand in every query. Budget a
migration step and an explicit decision about whether sync is opt-in or
mandatory before you start — both are cheap to decide now and expensive to
change later.

If offline-while-training genuinely matters to you as a feature (not just
as an implementation detail) — someone doing day 40 with no signal — weight
that towards **Path C (Firestore)** instead; it's the one option here where
"works offline" isn't something you have to build on top, it's the default.
