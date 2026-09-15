import { CalendarDates } from '@domain/value-objects/CalendarDate';

describe('CalendarDates', () => {
  it('rejects malformed and impossible dates', () => {
    expect(CalendarDates.parse('2026-1-1').ok).toBe(false);
    expect(CalendarDates.parse('2026-02-31').ok).toBe(false);
    expect(CalendarDates.parse('2026-02-28').ok).toBe(true);
  });

  it('counts whole calendar days regardless of time of day', () => {
    const late = CalendarDates.fromDate(new Date(2026, 0, 1, 23, 59));
    const early = CalendarDates.fromDate(new Date(2026, 0, 2, 0, 1));
    expect(CalendarDates.daysBetween(late, early)).toBe(1);
  });

  it('builds an inclusive ascending range', () => {
    const range = CalendarDates.range(
      CalendarDates.unsafe('2026-01-30'),
      CalendarDates.unsafe('2026-02-02'),
    );
    expect(range).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });

  it('returns an empty range when the end precedes the start', () => {
    expect(
      CalendarDates.range(CalendarDates.unsafe('2026-02-02'), CalendarDates.unsafe('2026-01-30')),
    ).toEqual([]);
  });
});
