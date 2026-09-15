import { ok, type Result } from '@core/result/Result';
import { DEFAULT_SETTINGS, type AppSettings } from '@domain/settings/AppSettings';
import type { SettingsRepository } from '@domain/ports/Repositories';
import { JsonDocument } from '@infrastructure/persistence/JsonDocument';
import { SettingsMapper } from '@infrastructure/persistence/mappers';
import { settingsSchema } from '@infrastructure/persistence/schemas';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';

export class PersistentSettingsRepository implements SettingsRepository {
  private readonly document: JsonDocument<typeof settingsSchema>;

  constructor(store: KeyValueStore) {
    this.document = new JsonDocument(store, 'settings', settingsSchema);
  }

  async load(): Promise<Result<AppSettings>> {
    const record = await this.document.read();
    // Preferences are not precious: a corrupt record falls back to defaults
    // rather than blocking the app behind an error screen.
    if (!record.ok) return ok(DEFAULT_SETTINGS);
    return ok(record.value ? SettingsMapper.toDomain(record.value) : DEFAULT_SETTINGS);
  }

  save(settings: AppSettings): Promise<Result<void>> {
    return this.document.write(SettingsMapper.toRecord(settings));
  }
}
