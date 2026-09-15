import type { Result } from '@core/result/Result';

/**
 * Command pattern. Every user intention is one object with one method, so the
 * presentation layer never orchestrates repositories by hand and each intention
 * can be tested with fakes in three lines.
 */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput>>;
}

/** Marker for use cases that need no arguments. */
export type NoInput = void;
