import { ChallengePrograms, PROGRAM_IDS } from '@domain/challenge/ChallengeProgram';
import { DailyLogs } from '@domain/challenge/DailyLog';
import { DayCompleteSpecification } from '@domain/challenge/specifications/DayCompleteSpecification';
import { ChallengeIds } from '@domain/shared/Identifier';
import { createDefaultTaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';
import { CalendarDates } from '@domain/value-objects/CalendarDate';

const strategies = createDefaultTaskStrategyRegistry();
const program = ChallengePrograms.resolve(PROGRAM_IDS.classic);

const emptyDay = () =>
  DailyLogs.create({
    challengeId: ChallengeIds.unsafe('c1'),
    attempt: 1,
    date: CalendarDates.unsafe('2026-01-01'),
    dayNumber: 1,
    program,
    strategies,
    updatedAt: '2026-01-01T00:00:00.000Z',
  });

describe('DayCompleteSpecification', () => {
  const specification = new DayCompleteSpecification(program, strategies);

  it('is not satisfied by a fresh day', () => {
    expect(specification.isSatisfiedBy(emptyDay())).toBe(false);
  });

  it('is not satisfied while a single required task is outstanding', () => {
    let log = emptyDay();
    for (const task of program.tasks.slice(0, -1)) {
      const command =
        task.kind === 'counter'
          ? ({ type: 'setAmount', amount: task.target } as const)
          : task.kind === 'photo'
            ? ({ type: 'attachPhoto', photoUri: 'file://a.jpg', capturedAt: 'now' } as const)
            : ({ type: 'setChecked', completed: true } as const);

      const applied = DailyLogs.applyInput(log, {
        taskId: task.id,
        command,
        program,
        strategies,
        updatedAt: 'now',
      });
      if (!applied.ok) throw applied.error;
      log = applied.value;
    }
    expect(specification.isSatisfiedBy(log)).toBe(false);
  });
});
