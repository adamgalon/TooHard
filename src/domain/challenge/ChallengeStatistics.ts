import type { ChallengeProgram } from '@domain/challenge/ChallengeProgram';
import type { DailyLog } from '@domain/challenge/DailyLog';
import type { TaskId } from '@domain/tasks/Task';
import { DailyLogs } from '@domain/challenge/DailyLog';
import type { TaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { CalendarDates } from '@domain/value-objects/CalendarDate';

export interface TaskConsistency {
  readonly taskId: TaskId;
  readonly title: string;
  readonly emoji: string;
  readonly completedDays: number;
  readonly trackedDays: number;
  /** 0…1 */
  readonly rate: number;
}

export interface ChallengeStatistics {
  readonly completedDays: number;
  readonly missedDays: number;
  readonly trackedDays: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly completionRate: number;
  readonly perTask: readonly TaskConsistency[];
}

const byDateAscending = (a: DailyLog, b: DailyLog): number => CalendarDates.compare(a.date, b.date);

/**
 * Pure read-model derived from the logs of a single attempt. Keeping it out of
 * the entities means the dashboard can recompute freely without touching state.
 */
export const computeStatistics = (input: {
  logs: readonly DailyLog[];
  program: ChallengeProgram;
  strategies: TaskStrategyRegistry;
}): ChallengeStatistics => {
  const ordered = [...input.logs].sort(byDateAscending);
  const completedDays = ordered.filter((log) => log.status === 'completed').length;
  const missedDays = ordered.filter((log) => log.status === 'missed').length;

  let currentStreak = 0;
  let longestStreak = 0;
  for (const log of ordered) {
    if (log.status === 'completed') {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else if (log.status === 'missed') {
      currentStreak = 0;
    }
  }

  const perTask: TaskConsistency[] = input.program.tasks.map((definition) => {
    const strategy = input.strategies.resolve(definition.kind);
    const tracked = ordered.filter((log) => log.status !== 'pending');
    const completed = tracked.filter((log) =>
      strategy.isSatisfied(definition, DailyLogs.progressFor(log, definition, input.strategies)),
    ).length;
    return {
      taskId: definition.id,
      title: definition.title,
      emoji: definition.emoji,
      completedDays: completed,
      trackedDays: tracked.length,
      rate: tracked.length === 0 ? 0 : completed / tracked.length,
    };
  });

  const trackedDays = ordered.filter((log) => log.status !== 'pending').length;

  return {
    completedDays,
    missedDays,
    trackedDays,
    currentStreak,
    longestStreak,
    completionRate: trackedDays === 0 ? 0 : completedDays / trackedDays,
    perTask,
  };
};
