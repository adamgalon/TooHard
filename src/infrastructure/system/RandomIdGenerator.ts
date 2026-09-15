import type { IdGenerator } from '@domain/shared/Identifier';

/**
 * Collision-resistant enough for local ids (one challenge per device) and
 * dependency-free. Swap for `expo-crypto`'s UUID when sync arrives.
 */
export class RandomIdGenerator implements IdGenerator {
  next(): string {
    const time = Date.now().toString(36);
    const noise = Math.random().toString(36).slice(2, 10);
    return `${time}-${noise}`;
  }
}

/** Deterministic counterpart for tests and snapshots. */
export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;

  constructor(private readonly prefix = 'id') {}

  next(): string {
    this.counter += 1;
    return `${this.prefix}-${this.counter}`;
  }
}
