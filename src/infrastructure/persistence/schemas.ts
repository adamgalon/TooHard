import { z } from 'zod';

/**
 * Persisted shapes are validated on every read.
 *
 * Storage is the one place where "TypeScript says so" is not evidence: the JSON
 * on disk was written by an older build. Zod turns a corrupt or outdated record
 * into a typed error instead of an undefined-property crash three screens later.
 */
const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const taskProgressSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('checkbox'), completed: z.boolean() }),
  z.object({ kind: z.literal('counter'), amount: z.number().min(0) }),
  z.object({
    kind: z.literal('photo'),
    photoUri: z.string().nullable(),
    capturedAt: z.string().nullable(),
  }),
]);

export const attemptSummarySchema = z.object({
  attempt: z.number().int().positive(),
  startDate: calendarDateSchema,
  endedOn: calendarDateSchema,
  completedDays: z.number().int().min(0),
  reason: z.enum(['failed', 'abandoned']),
});

export const challengeSchema = z.object({
  id: z.string().min(1),
  programId: z.string().min(1),
  status: z.enum(['active', 'completed', 'abandoned']),
  startDate: calendarDateSchema,
  attempt: z.number().int().positive(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  previousAttempts: z.array(attemptSummarySchema),
});

export const dailyLogSchema = z.object({
  id: z.string().min(1),
  challengeId: z.string().min(1),
  attempt: z.number().int().positive(),
  date: calendarDateSchema,
  dayNumber: z.number().int().positive(),
  status: z.enum(['pending', 'completed', 'missed']),
  entries: z.record(z.string(), taskProgressSchema),
  note: z.string().nullable(),
  updatedAt: z.string(),
});

export const dailyLogCollectionSchema = z.array(dailyLogSchema);

export const settingsSchema = z.object({
  themePreference: z.enum(['system', 'light', 'dark']),
  hapticsEnabled: z.boolean(),
  reminderEnabled: z.boolean(),
  reminder: z.object({
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
  }),
  hasSeenIntro: z.boolean(),
});

/** Bumped whenever a stored shape changes; see `migrations.ts`. */
export const SCHEMA_VERSION = 1;

export const envelopeSchema = <T extends z.ZodTypeAny>(payload: T) =>
  z.object({ version: z.number().int().positive(), data: payload });

export type ChallengeRecord = z.infer<typeof challengeSchema>;
export type DailyLogRecord = z.infer<typeof dailyLogSchema>;
export type SettingsRecord = z.infer<typeof settingsSchema>;
