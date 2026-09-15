import type { Brand } from '@core/types/Brand';
import { TaskIds, type TaskDefinition } from '@domain/tasks/Task';
import type { FailurePolicyId } from '@domain/challenge/policies/FailurePolicy';

export type ProgramId = Brand<string, 'ProgramId'>;

/**
 * A programme is the *rule set* of a challenge: how long it runs, what has to
 * happen every day, and what a missed day costs.
 *
 * Keeping it as data (rather than hard-coding "75 Hard" through the app) means
 * variants and, later, fully custom challenges are the same code path.
 */
export interface ChallengeProgram {
  readonly id: ProgramId;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  readonly durationDays: number;
  readonly failurePolicyId: FailurePolicyId;
  readonly accent: string;
  readonly tasks: readonly TaskDefinition[];
}

const task = {
  diet: (): TaskDefinition => ({
    id: TaskIds.unsafe('diet'),
    kind: 'checkbox',
    title: 'Follow your diet',
    subtitle: 'No alcohol, no cheat meals',
    emoji: '🥗',
    required: true,
  }),
  indoorWorkout: (): TaskDefinition => ({
    id: TaskIds.unsafe('workout-indoor'),
    kind: 'checkbox',
    title: '45-minute workout',
    subtitle: 'Anywhere you like',
    emoji: '🏋️',
    required: true,
  }),
  outdoorWorkout: (): TaskDefinition => ({
    id: TaskIds.unsafe('workout-outdoor'),
    kind: 'checkbox',
    title: '45-minute outdoor workout',
    subtitle: 'Rain, snow or shine',
    emoji: '🌧️',
    required: true,
  }),
  anyWorkout: (): TaskDefinition => ({
    id: TaskIds.unsafe('workout'),
    kind: 'checkbox',
    title: '45-minute workout',
    subtitle: 'Indoors or outdoors',
    emoji: '🏃',
    required: true,
  }),
  water: (target: number): TaskDefinition => ({
    id: TaskIds.unsafe('water'),
    kind: 'counter',
    title: 'Drink water',
    subtitle: `${target} litres — about a US gallon`,
    emoji: '💧',
    required: true,
    target,
    unit: 'L',
    step: 0.25,
  }),
  reading: (target: number): TaskDefinition => ({
    id: TaskIds.unsafe('reading'),
    kind: 'counter',
    title: 'Read non-fiction',
    subtitle: `${target} pages, physical book`,
    emoji: '📖',
    required: true,
    target,
    unit: 'pages',
    step: 1,
  }),
  progressPhoto: (): TaskDefinition => ({
    id: TaskIds.unsafe('progress-photo'),
    kind: 'photo',
    title: 'Progress photo',
    subtitle: 'Same spot, same light',
    emoji: '📸',
    required: true,
  }),
} as const;

export const PROGRAM_IDS = {
  classic: 'classic-75-hard' as ProgramId,
  medium: '75-medium' as ProgramId,
  soft: '75-soft' as ProgramId,
} as const;

const CLASSIC_75_HARD: ChallengeProgram = {
  id: PROGRAM_IDS.classic,
  name: '75 Hard',
  tagline: 'The original. No substitutions.',
  description:
    'Seventy-five consecutive days of six non-negotiable tasks. Miss one item on one day and you start again at day 1.',
  durationDays: 75,
  failurePolicyId: 'strict-restart',
  accent: '#FF4D4D',
  tasks: [
    task.diet(),
    task.indoorWorkout(),
    task.outdoorWorkout(),
    task.water(3.8),
    task.reading(10),
    task.progressPhoto(),
  ],
};

const SEVENTY_FIVE_MEDIUM: ChallengeProgram = {
  id: PROGRAM_IDS.medium,
  name: '75 Medium',
  tagline: 'One workout a day, same discipline.',
  description:
    'The same seventy-five days, trimmed to a single workout. Still strict: a missed day resets the counter.',
  durationDays: 75,
  failurePolicyId: 'strict-restart',
  accent: '#FF9F1C',
  tasks: [
    task.diet(),
    task.anyWorkout(),
    task.water(3.0),
    task.reading(10),
    task.progressPhoto(),
  ],
};

const SEVENTY_FIVE_SOFT: ChallengeProgram = {
  id: PROGRAM_IDS.soft,
  name: '75 Soft',
  tagline: 'Build the habit before you test it.',
  description:
    'Seventy-five days of consistent effort. A missed day is recorded honestly, but it does not wipe out your progress.',
  durationDays: 75,
  failurePolicyId: 'forgiving',
  accent: '#2EC4B6',
  tasks: [task.diet(), task.anyWorkout(), task.water(3.0), task.reading(10)],
};

const CATALOGUE: readonly ChallengeProgram[] = [
  CLASSIC_75_HARD,
  SEVENTY_FIVE_MEDIUM,
  SEVENTY_FIVE_SOFT,
];

export const ChallengePrograms = {
  all: (): readonly ChallengeProgram[] => CATALOGUE,
  default: (): ChallengeProgram => CLASSIC_75_HARD,
  find: (id: ProgramId): ChallengeProgram | undefined =>
    CATALOGUE.find((program) => program.id === id),
  /** Falls back to the classic programme so stored data can never orphan a run. */
  resolve: (id: ProgramId): ChallengeProgram => ChallengePrograms.find(id) ?? CLASSIC_75_HARD,
  requiredTasks: (program: ChallengeProgram): readonly TaskDefinition[] =>
    program.tasks.filter((definition) => definition.required),
} as const;
