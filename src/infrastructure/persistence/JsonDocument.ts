import type { z } from 'zod';

import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';
import { SCHEMA_VERSION } from '@infrastructure/persistence/schemas';

/**
 * One validated JSON document in the key-value store.
 *
 * Every repository below is three lines of glue on top of this, which is why
 * parsing, versioning and error translation only exist in one place.
 */
export class JsonDocument<TSchema extends z.ZodTypeAny> {
  constructor(
    private readonly store: KeyValueStore,
    private readonly key: string,
    private readonly schema: TSchema,
  ) {}

  async read(): Promise<Result<z.infer<TSchema> | null>> {
    const raw = await this.store.read(this.key);
    if (!raw.ok) return raw;
    if (raw.value === null) return ok(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.value);
    } catch (cause) {
      return err(AppErrors.corrupted(`"${this.key}" is not valid JSON.`, { cause }));
    }

    const envelope = parsed as { version?: number; data?: unknown };
    if (typeof envelope?.version !== 'number') {
      return err(AppErrors.corrupted(`"${this.key}" is missing its version header.`));
    }
    if (envelope.version > SCHEMA_VERSION) {
      return err(
        AppErrors.corrupted(
          `"${this.key}" was written by a newer version of the app (v${envelope.version}).`,
        ),
      );
    }

    const validated = this.schema.safeParse(envelope.data);
    if (!validated.success) {
      return err(
        AppErrors.corrupted(`"${this.key}" does not match the expected shape.`, {
          details: { issues: validated.error.issues.slice(0, 5) },
        }),
      );
    }
    return ok(validated.data as z.infer<TSchema>);
  }

  async write(data: z.infer<TSchema>): Promise<Result<void>> {
    const payload = JSON.stringify({ version: SCHEMA_VERSION, data });
    return this.store.write(this.key, payload);
  }

  async clear(): Promise<Result<void>> {
    return this.store.remove(this.key);
  }
}
