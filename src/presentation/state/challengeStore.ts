import { createStore, type StoreApi } from 'zustand/vanilla';

import type { AppError } from '@core/errors/AppError';
import type { Result } from '@core/result/Result';
import type { ProgramId } from '@domain/challenge/ChallengeProgram';
import type { PhotoSource } from '@domain/ports/Services';
import type { TaskId, TaskInput } from '@domain/tasks/Task';
import type { CalendarView, DashboardView } from '@application/dto/Views';
import type { StatisticsView } from '@application/use-cases/GetStatistics';
import type { AppContainer } from '@di/types';

export type Phase = 'idle' | 'loading' | 'ready' | 'error';

export interface Notice {
  readonly tone: 'info' | 'success' | 'warning' | 'danger';
  readonly title: string;
  readonly message?: string;
}

export interface ChallengeState {
  readonly phase: Phase;
  readonly dashboard: DashboardView | null;
  readonly calendar: CalendarView | null;
  readonly statistics: StatisticsView | null;
  readonly error: AppError | null;
  readonly notice: Notice | null;
  /** Tasks with an in-flight command, so their controls can be disabled. */
  readonly pendingTasks: readonly TaskId[];
}

export interface ChallengeActions {
  bootstrap(): Promise<void>;
  refresh(): Promise<void>;
  startChallenge(programId: ProgramId): Promise<void>;
  sendTaskCommand(taskId: TaskId, command: TaskInput): Promise<void>;
  capturePhoto(taskId: TaskId, source: PhotoSource): Promise<void>;
  saveNote(note: string | null): Promise<void>;
  endChallenge(): Promise<void>;
  dismissNotice(): void;
  clearError(): void;
}

export type ChallengeStore = StoreApi<ChallengeState & ChallengeActions>;

const INITIAL: ChallengeState = {
  phase: 'idle',
  dashboard: null,
  calendar: null,
  statistics: null,
  error: null,
  notice: null,
  pendingTasks: [],
};

/**
 * The store owns view state and nothing else: every decision is delegated to a
 * use case, and the only thing stored is what the screens render.
 */
export const createChallengeStore = (container: AppContainer): ChallengeStore =>
  createStore<ChallengeState & ChallengeActions>((set, get) => {
    const { useCases, logger } = container;

    const fail = (error: AppError): void => {
      logger.log('error', error.message, { code: error.code });
      set({ phase: 'error', error });
    };

    /** Unwraps a result, recording the failure and returning `null` instead. */
    const take = <T,>(result: Result<T>): T | null => {
      if (result.ok) return result.value;
      fail(result.error);
      return null;
    };

    const loadSecondaryViews = async (): Promise<void> => {
      const [calendar, statistics] = await Promise.all([
        useCases.getCalendar.execute(),
        useCases.getStatistics.execute(),
      ]);
      set({
        calendar: calendar.ok ? calendar.value : null,
        statistics: statistics.ok ? statistics.value : null,
      });
    };

    const loadEverything = async (): Promise<void> => {
      const dashboard = await useCases.getDashboard.execute();
      if (!dashboard.ok) return fail(dashboard.error);
      set({ phase: 'ready', dashboard: dashboard.value, error: null });
      await loadSecondaryViews();
    };

    /**
     * Hoisted so other actions can call it directly: screens select actions off
     * the store, which detaches them from `this`.
     */
    const bootstrap = async (): Promise<void> => {
      set({ phase: get().dashboard ? get().phase : 'loading' });
      // Settle elapsed days before rendering anything: the user must not see
      // a stale "day 12" that a missed day has already invalidated.
      const synchronized = await useCases.synchronize.execute();
      if (!synchronized.ok) return fail(synchronized.error);

      if (synchronized.value.restarted) {
        set({
          notice: {
            tone: 'danger',
            title: 'Back to day 1',
            message: synchronized.value.restartReason ?? undefined,
          },
        });
      } else if (synchronized.value.completed) {
        set({
          notice: { tone: 'success', title: 'Challenge complete', message: 'All 75 days. Done.' },
        });
      }
      await loadEverything();
    };

    return {
      ...INITIAL,
      bootstrap,
      refresh: bootstrap,

      async startChallenge(programId) {
        set({ phase: 'loading' });
        const started = await useCases.startChallenge.execute({ programId });
        if (!started.ok) return fail(started.error);
        set({ notice: { tone: 'info', title: 'Day 1 starts now.' } });
        await loadEverything();
      },

      async sendTaskCommand(taskId, command) {
        const dashboard = get().dashboard;
        if (!dashboard) return;

        set({ pendingTasks: [...get().pendingTasks, taskId] });
        const updated = await useCases.updateTaskProgress.execute({
          date: dashboard.today.date,
          taskId,
          command,
        });
        set({ pendingTasks: get().pendingTasks.filter((id) => id !== taskId) });

        const value = take(updated);
        if (!value) return;
        set({ dashboard: value, error: null, phase: 'ready' });
        await loadSecondaryViews();
      },

      async capturePhoto(taskId, source) {
        const dashboard = get().dashboard;
        if (!dashboard) return;

        set({ pendingTasks: [...get().pendingTasks, taskId] });
        const captured = await useCases.captureProgressPhoto.execute({
          date: dashboard.today.date,
          source,
          taskId,
        });
        set({ pendingTasks: get().pendingTasks.filter((id) => id !== taskId) });

        if (!captured.ok) return fail(captured.error);
        // `null` means the user cancelled the picker — not an error, not a change.
        if (captured.value === null) return;
        set({ dashboard: captured.value, error: null, phase: 'ready' });
        await loadSecondaryViews();
      },

      async saveNote(note) {
        const dashboard = get().dashboard;
        if (!dashboard) return;
        const updated = await useCases.setDayNote.execute({ date: dashboard.today.date, note });
        const value = take(updated);
        if (value) set({ dashboard: value });
      },

      async endChallenge() {
        const ended = await useCases.endChallenge.execute();
        if (!ended.ok) return fail(ended.error);
        set({ ...INITIAL, phase: 'ready' });
      },

      dismissNotice() {
        set({ notice: null });
      },

      clearError() {
        set({ error: null, phase: get().dashboard ? 'ready' : 'idle' });
      },
    };
  });
