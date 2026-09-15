import { Challenges } from '@domain/challenge/Challenge';
import { DailyLogs, type DailyLog } from '@domain/challenge/DailyLog';
import { computeStatistics } from '@domain/challenge/ChallengeStatistics';
import type { TaskDefinition } from '@domain/tasks/Task';
import type { TaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { CalendarDates } from '@domain/value-objects/CalendarDate';
import type { ChallengeContext } from '@application/services/ChallengeContextService';
import type { DashboardView, DayView, TaskView } from '@application/dto/Views';

const toTaskView = (
  definition: TaskDefinition,
  log: DailyLog,
  strategies: TaskStrategyRegistry,
): TaskView => {
  const strategy = strategies.resolve(definition.kind);
  const progress = DailyLogs.progressFor(log, definition, strategies);
  return {
    id: definition.id,
    kind: definition.kind,
    title: definition.title,
    subtitle: definition.subtitle,
    emoji: definition.emoji,
    required: definition.required,
    progress,
    satisfied: strategy.isSatisfied(definition, progress),
    ratio: strategy.completionRatio(definition, progress),
    summary: strategy.summarize(definition, progress),
    target: definition.kind === 'counter' ? definition.target : null,
    unit: definition.kind === 'counter' ? definition.unit : null,
    step: definition.kind === 'counter' ? definition.step : null,
  };
};

export const toDayView = (log: DailyLog, context: ChallengeContext): DayView => {
  const isToday = CalendarDates.isSame(log.date, context.today);
  return {
    date: log.date,
    dayNumber: log.dayNumber,
    status: log.status,
    isToday,
    // Only today can be edited: back-filling yesterday would make the streak a
    // story rather than a record.
    isEditable: isToday && context.challenge.status === 'active',
    ratio: DailyLogs.completionRatio(log, context.program, context.strategies),
    note: log.note,
    tasks: context.program.tasks.map((definition) => toTaskView(definition, log, context.strategies)),
  };
};

export const toDashboardView = (
  context: ChallengeContext,
  todayLog: DailyLog,
  attemptLogs: readonly DailyLog[],
): DashboardView => {
  const { challenge, program } = context;
  const statistics = computeStatistics({
    logs: attemptLogs,
    program,
    strategies: context.strategies,
  });
  const dayNumber = Challenges.dayNumberFor(challenge, context.today);
  const startsInDays = Math.max(0, 1 - dayNumber);

  return {
    challengeId: challenge.id,
    programId: program.id,
    programName: program.name,
    accent: program.accent,
    status: challenge.status,
    totalDays: program.durationDays,
    attempt: challenge.attempt,
    dayNumber: Math.min(Math.max(dayNumber, 1), program.durationDays),
    daysRemaining: Math.max(0, program.durationDays - statistics.completedDays),
    completedDays: statistics.completedDays,
    currentStreak: statistics.currentStreak,
    longestStreak: statistics.longestStreak,
    bestAttemptDays: Challenges.bestAttemptDays(challenge, statistics.completedDays),
    startsInDays,
    today: toDayView(todayLog, context),
  };
};
