import { ok, type Result } from '@core/result/Result';
import type { Challenge } from '@domain/challenge/Challenge';
import type { ChallengeRepository } from '@domain/ports/Repositories';
import { JsonDocument } from '@infrastructure/persistence/JsonDocument';
import { ChallengeMapper } from '@infrastructure/persistence/mappers';
import { challengeSchema } from '@infrastructure/persistence/schemas';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';

export class PersistentChallengeRepository implements ChallengeRepository {
  private readonly document: JsonDocument<typeof challengeSchema>;

  constructor(store: KeyValueStore) {
    this.document = new JsonDocument(store, 'challenge', challengeSchema);
  }

  async find(): Promise<Result<Challenge | null>> {
    const record = await this.document.read();
    if (!record.ok) return record;
    return ok(record.value ? ChallengeMapper.toDomain(record.value) : null);
  }

  save(challenge: Challenge): Promise<Result<void>> {
    return this.document.write(ChallengeMapper.toRecord(challenge));
  }

  clear(): Promise<Result<void>> {
    return this.document.clear();
  }
}
