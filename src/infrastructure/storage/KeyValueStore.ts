import type { Result } from '@core/result/Result';

/**
 * The narrowest possible persistence port: everything the repositories need,
 * nothing AsyncStorage-specific. Swapping in SQLite or MMKV is one new class.
 */
export interface KeyValueStore {
  read(key: string): Promise<Result<string | null>>;
  write(key: string, value: string): Promise<Result<void>>;
  remove(key: string): Promise<Result<void>>;
}
