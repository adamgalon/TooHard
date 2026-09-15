import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppErrors } from '@core/errors/AppError';
import { fromPromise, type Result } from '@core/result/Result';
import type { KeyValueStore } from '@infrastructure/storage/KeyValueStore';

export class AsyncStorageKeyValueStore implements KeyValueStore {
  constructor(private readonly namespace = 'toohard') {}

  private scoped(key: string): string {
    return `${this.namespace}:${key}`;
  }

  read(key: string): Promise<Result<string | null>> {
    return fromPromise(AsyncStorage.getItem(this.scoped(key)), (cause) =>
      AppErrors.storageRead(`Could not read "${key}".`, { cause }),
    );
  }

  write(key: string, value: string): Promise<Result<void>> {
    return fromPromise(AsyncStorage.setItem(this.scoped(key), value), (cause) =>
      AppErrors.storageWrite(`Could not save "${key}".`, { cause }),
    );
  }

  remove(key: string): Promise<Result<void>> {
    return fromPromise(AsyncStorage.removeItem(this.scoped(key)), (cause) =>
      AppErrors.storageWrite(`Could not remove "${key}".`, { cause }),
    );
  }
}
