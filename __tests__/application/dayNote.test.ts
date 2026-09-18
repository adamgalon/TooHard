import { CalendarDates } from '@domain/value-objects/CalendarDate';

import { CLASSIC, createHarness } from '../support/harness';

describe('SetDayNoteUseCase', () => {
  it("attaches a note to today's log and reflects it on the dashboard", async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });

    const result = await harness.container.useCases.setDayNote.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      note: 'Felt strong today.',
    });

    expect(result.ok && result.value.today.note).toBe('Felt strong today.');
  });

  it('clears a note by passing null', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    await harness.container.useCases.setDayNote.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      note: 'Draft note',
    });

    const cleared = await harness.container.useCases.setDayNote.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      note: null,
    });

    expect(cleared.ok && cleared.value.today.note).toBeNull();
  });

  it('refuses to write a note for a day other than today', async () => {
    const harness = createHarness();
    await harness.container.useCases.startChallenge.execute({ programId: CLASSIC });
    harness.clock.advanceDays(1);

    const result = await harness.container.useCases.setDayNote.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      note: 'Too late',
    });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe('VALIDATION_FAILED');
  });

  it('fails when there is no active challenge', async () => {
    const harness = createHarness();
    const result = await harness.container.useCases.setDayNote.execute({
      date: CalendarDates.unsafe('2026-01-01'),
      note: 'No challenge yet',
    });

    expect(result.ok).toBe(false);
  });
});
