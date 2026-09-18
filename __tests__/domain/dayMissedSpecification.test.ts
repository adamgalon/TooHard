import { ChallengePrograms, PROGRAM_IDS } from '@domain/challenge/ChallengeProgram';
import { DailyLogs } from '@domain/challenge/DailyLog';
import { DayCompleteSpecification } from '@domain/challenge/specifications/DayCompleteSpecification';
import { DayMissedSpecification } from '@domain/challenge/specifications/DayMissedSpecification';
import { ChallengeIds } from '@domain/shared/Identifier';
import { createDefaultTaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { CalendarDates } from '@domain/value-objects/CalendarDate';

const strategies = createDefaultTaskStrategyRegistry();
const program = ChallengePrograms.resolve(PROGRAM_IDS.classic);
const dayComplete = new DayCompleteSpecification(program, strategies);

const dayOn = (date: string) =>
  DailyLogs.create({
    challengeId: ChallengeIds.unsafe('c1'),
    attempt: 1,
    date: CalendarDates.unsafe(date),
    dayNumber: 1,
    program,
    strategies,
    updatedAt: `${date}T00:00:00.000Z`,
  });

const completeEveryTask = (log: ReturnType<typeof dayOn>) => {
  let next = log;
  for (const task of program.tasks) {
    const command =
      task.kind === 'counter'
        ? ({ type: 'setAmount', amount: task.target } as const)
        : task.kind === 'photo'
          ? ({ type: 'attachPhoto', photoUri: 'file://a.jpg', capturedAt: 'now' } as const)
          : ({ type: 'setChecked', completed: true } as const);
    const applied = DailyLogs.applyInput(next, {
      taskId: task.id,
      command,
      program,
      strategies,
      updatedAt: 'now',
    });
    if (!applied.ok) throw applied.error;
    next = applied.value;
  }
  return next;
};

describe('DayMissedSpecification', () => {
  const today = CalendarDates.unsafe('2026-01-10');
  const specification = new DayMissedSpecification(today, dayComplete);

  it('never treats today as missed, even when incomplete', () => {
    expect(specification.isSatisfiedBy(dayOn('2026-01-10'))).toBe(false);
  });

  it('does not treat a future date as missed', () => {
    expect(specification.isSatisfiedBy(dayOn('2026-01-11'))).toBe(false);
  });

  it('treats a past, incomplete day as missed', () => {
    expect(specification.isSatisfiedBy(dayOn('2026-01-09'))).toBe(true);
  });

  it('does not treat a past, fully-completed day as missed', () => {
    expect(specification.isSatisfiedBy(completeEveryTask(dayOn('2026-01-09')))).toBe(false);
  });
});
