import type { Brand } from '@core/types/Brand';

export type ChallengeId = Brand<string, 'ChallengeId'>;
export type DailyLogId = Brand<string, 'DailyLogId'>;

/**
 * Port for id generation: the domain must not reach for `crypto` or `Date.now`
 * directly, otherwise entity factories stop being deterministic in tests.
 */
export interface IdGenerator {
  next(): string;
}

export const ChallengeIds = {
  unsafe: (value: string): ChallengeId => value as ChallengeId,
  create: (generator: IdGenerator): ChallengeId => generator.next() as ChallengeId,
} as const;

export const DailyLogIds = {
  unsafe: (value: string): DailyLogId => value as DailyLogId,
  /** Deterministic: one log per (challenge, date) makes duplicates impossible. */
  compose: (challengeId: ChallengeId, date: string): DailyLogId =>
    `${challengeId}:${date}` as DailyLogId,
} as const;
