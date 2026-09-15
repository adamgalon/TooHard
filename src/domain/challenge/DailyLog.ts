import { AppErrors } from '@core/errors/AppError';
import { err, ok, type Result } from '@core/result/Result';
import { DailyLogIds, type ChallengeId, type DailyLogId } from '@domain/shared/Identifier';
import type { ChallengeProgram } from '@domain/challenge/ChallengeProgram';
import type { TaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import type { TaskDefinition, TaskId, TaskInput, TaskProgress } from '@domain/tasks/Task';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';

export type DayStatus = 'pending' | 'completed' | 'missed';

/**
 * One day of one attempt. `entries` is keyed by task id so a programme can
 * gain or lose tasks without invalidating history.
 */
export interface DailyLog {
  readonly id: DailyLogId;
  readonly challengeId: ChallengeId;
  readonly attempt: number;
  readonly date: CalendarDate;
  readonly dayNumber: number;
  readonly status: DayStatus;
  readonly entries: Readonly<Record<string, TaskProgress>>;
  readonly note: string | null;
  readonly updatedAt: string;
}

export const DailyLogs = {
  create(input: {
    challengeId: ChallengeId;
    attempt: number;
    date: CalendarDate;
    dayNumber: number;
    program: ChallengeProgram;
    strategies: TaskStrategyRegistry;
    updatedAt: string;
  }): DailyLog {
    const entries: Record<string, TaskProgress> = {};
    for (const definition of input.program.tasks) {
      entries[definition.id] = input.strategies.resolve(definition.kind).initial(definition);
    }
    return {
      id: DailyLogIds.compose(input.challengeId, input.date),
      challengeId: input.challengeId,
      attempt: input.attempt,
      date: input.date,
      dayNumber: input.dayNumber,
      status: 'pending',
      entries,
      note: null,
      updatedAt: input.updatedAt,
    };
  },

  progressFor(log: DailyLog, definition: TaskDefinition, strategies: TaskStrategyRegistry): TaskProgress {
    return log.entries[definition.id] ?? strategies.resolve(definition.kind).initial(definition);
  },

  /** Applies one task command, delegating the transition to the task's strategy. */
  applyInput(
    log: DailyLog,
    input: {
      taskId: TaskId;
      command: TaskInput;
      program: ChallengeProgram;
      strategies: TaskStrategyRegistry;
      updatedAt: string;
    },
  ): Result<DailyLog> {
    const definition = input.program.tasks.find((candidate) => candidate.id === input.taskId);
    if (!definition) {
      return err(AppErrors.notFound(`Task "${input.taskId}" is not part of this programme.`));
    }
    const strategy = input.strategies.resolve(definition.kind);
    const current = DailyLogs.progressFor(log, definition, input.strategies);
    const next = strategy.apply(definition, current, input.command);
    if (!next.ok) return next;

    return ok({
      ...log,
      entries: { ...log.entries, [definition.id]: next.value },
      updatedAt: input.updatedAt,
    });
  },

  withNote(log: DailyLog, note: string | null, updatedAt: string): DailyLog {
    const trimmed = note?.trim() ?? '';
    return { ...log, note: trimmed.length > 0 ? trimmed : null, updatedAt };
  },

  withStatus(log: DailyLog, status: DayStatus, updatedAt: string): DailyLog {
    return log.status === status ? log : { ...log, status, updatedAt };
  },

  /** Fraction of required tasks satisfied, 0…1 — drives the day ring. */
  completionRatio(
    log: DailyLog,
    program: ChallengeProgram,
    strategies: TaskStrategyRegistry,
  ): number {
    const required = program.tasks.filter((definition) => definition.required);
    if (required.length === 0) return 1;
    const total = required.reduce((sum, definition) => {
      const strategy = strategies.resolve(definition.kind);
      return sum + strategy.completionRatio(definition, DailyLogs.progressFor(log, definition, strategies));
    }, 0);
    return Math.min(1, total / required.length);
  },
} as const;
