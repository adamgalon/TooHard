import { ok, type Result } from '@core/result/Result';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';

/** Test double and web fallback; also handy for Storybook-style previews. */
export class InMemoryKeyValueStore implements KeyValueStore {
  private readonly entries = new Map<string, string>();

  async read(key: string): Promise<Result<string | null>> {
    return ok(this.entries.get(key) ?? null);
  }

  async write(key: string, value: string): Promise<Result<void>> {
    this.entries.set(key, value);
    return ok(undefined);
  }

  async remove(key: string): Promise<Result<void>> {
    this.entries.delete(key);
    return ok(undefined);
  }
}
