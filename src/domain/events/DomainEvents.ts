import type { ChallengeId } from '@domain/shared/Identifier';
import type { TaskId } from '@domain/tasks/Task';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';

/**
 * The facts the app broadcasts. Handlers (haptics, reminders, analytics) react
 * without the use cases knowing they exist.
 */
export interface DomainEventMap {
  'challenge/started': { challengeId: ChallengeId; startDate: CalendarDate };
  'challenge/restarted': { challengeId: ChallengeId; attempt: number; reason: string };
  'challenge/completed': { challengeId: ChallengeId; totalDays: number };
  'challenge/abandoned': { challengeId: ChallengeId };
  'day/taskUpdated': { date: CalendarDate; taskId: TaskId; satisfied: boolean };
  'day/completed': { date: CalendarDate; dayNumber: number };
  'day/missed': { date: CalendarDate; dayNumber: number };
}

export type DomainEventName = keyof DomainEventMap;
