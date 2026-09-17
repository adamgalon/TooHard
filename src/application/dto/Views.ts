import type { ChallengeId } from '@domain/shared/Identifier';
import type { ChallengeStatus } from '@domain/challenge/Challenge';
import type { DayStatus } from '@domain/challenge/DailyLog';
import type { ProgramId } from '@domain/challenge/ChallengeProgram';
import type { TaskId, TaskKind, TaskProgress } from '@domain/tasks/Task';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';

/**
 * Read models. Screens render these and nothing else — they never receive an
 * entity, so a change to persistence cannot ripple into a component.
 */
export interface TaskView {
  readonly id: TaskId;
  readonly kind: TaskKind;
  readonly title: string;
  readonly subtitle: string;
  readonly emoji: string;
  readonly required: boolean;
  readonly progress: TaskProgress;
  readonly satisfied: boolean;
  readonly ratio: number;
  readonly summary: string;
  readonly target: number | null;
  readonly unit: string | null;
  readonly step: number | null;
}

export interface DayView {
  readonly date: CalendarDate;
  readonly dayNumber: number;
  readonly status: DayStatus;
  readonly isToday: boolean;
  readonly isEditable: boolean;
  readonly ratio: number;
  readonly note: string | null;
  readonly tasks: readonly TaskView[];
}

export interface DashboardView {
  readonly challengeId: ChallengeId;
  readonly programId: ProgramId;
  readonly programName: string;
  readonly accent: string;
  readonly status: ChallengeStatus;
  readonly totalDays: number;
  readonly attempt: number;
  readonly dayNumber: number;
  readonly daysRemaining: number;
  readonly completedDays: number;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly bestAttemptDays: number;
  readonly startsInDays: number;
  readonly today: DayView;
}

export interface CalendarCell {
  readonly date: CalendarDate;
  readonly dayNumber: number;
  readonly status: DayStatus;
  readonly ratio: number;
  readonly isToday: boolean;
  readonly isFuture: boolean;
}

export interface CalendarView {
  readonly attempt: number;
  readonly totalDays: number;
  readonly cells: readonly CalendarCell[];
}

export interface PhotoTimelineEntry {
  readonly date: CalendarDate;
  readonly dayNumber: number;
  readonly photoUri: string;
}

export interface PhotoTimelineView {
  /** Oldest first, matching every other date-ordered view in the app. */
  readonly entries: readonly PhotoTimelineEntry[];
  /** `null` when there are fewer than two photos to compare. */
  readonly beforeAfter: { readonly before: PhotoTimelineEntry; readonly after: PhotoTimelineEntry } | null;
}
