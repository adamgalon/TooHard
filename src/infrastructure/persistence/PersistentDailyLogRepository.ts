import { ok, type Result } from '@core/result/Result';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { DailyLogQuery, DailyLogRepository } from '@domain/ports/Repositories';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';
import { JsonDocument } from '@infrastructure/persistence/JsonDocument';
import { DailyLogMapper } from '@infrastructure/persistence/mappers';
import { dailyLogCollectionSchema, type DailyLogRecord } from '@infrastructure/persistence/schemas';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';

/**
 * All logs live in one document: a challenge is at most a few hundred small
 * records, so a single read beats per-key round trips on every dashboard load.
 */
export class PersistentDailyLogRepository implements DailyLogRepository {
  private readonly document: JsonDocument<typeof dailyLogCollectionSchema>;

  constructor(store: KeyValueStore) {
    this.document = new JsonDocument(store, 'daily-logs', dailyLogCollectionSchema);
  }

  private async readAll(): Promise<Result<DailyLogRecord[]>> {
    const records = await this.document.read();
    if (!records.ok) return records;
    return ok(records.value ?? []);
  }

  async findByDate(
    query: DailyLogQuery & { date: CalendarDate },
  ): Promise<Result<DailyLog | null>> {
    const records = await this.readAll();
    if (!records.ok) return records;
    const found = records.value.find(
      (record) =>
        record.challengeId === query.challengeId &&
        record.attempt === query.attempt &&
        record.date === query.date,
    );
    return ok(found ? DailyLogMapper.toDomain(found) : null);
  }

  async listForAttempt(query: DailyLogQuery): Promise<Result<DailyLog[]>> {
    const records = await this.readAll();
    if (!records.ok) return records;
    return ok(
      records.value
        .filter(
          (record) =>
            record.challengeId === query.challengeId && record.attempt === query.attempt,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(DailyLogMapper.toDomain),
    );
  }

  save(log: DailyLog): Promise<Result<void>> {
    return this.saveMany([log]);
  }

  async saveMany(logs: readonly DailyLog[]): Promise<Result<void>> {
    if (logs.length === 0) return ok(undefined);
    const records = await this.readAll();
    if (!records.ok) return records;

    const byId = new Map(records.value.map((record) => [record.id, record] as const));
    for (const log of logs) {
      byId.set(log.id, DailyLogMapper.toRecord(log));
    }
    return this.document.write([...byId.values()]);
  }

  clear(): Promise<Result<void>> {
    return this.document.clear();
  }
}
