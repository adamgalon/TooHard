import { z } from 'zod';

import { challengeSchema, dailyLogSchema, settingsSchema } from '@infrastructure/persistence/schemas';

/**
 * The on-disk shape of a backup file. Reuses the exact same record schemas
 * the AsyncStorage repositories validate against — a backup is just those
 * three records travelling through a file instead of a key-value store, so
 * there is no second, parallel definition of what a "valid challenge" is.
 */
export const backupBundleSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: z.string(),
  challenge: challengeSchema.nullable(),
  dailyLogs: z.array(dailyLogSchema),
  settings: settingsSchema,
});

export type BackupBundleRecord = z.infer<typeof backupBundleSchema>;
