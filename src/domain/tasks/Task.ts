import type { Brand } from '@core/types/Brand';

/** Stable identifier of a task inside a programme, e.g. `outdoor-workout`. */
export type TaskId = Brand<string, 'TaskId'>;

export const TaskIds = {
  unsafe: (value: string): TaskId => value as TaskId,
} as const;

export type TaskKind = 'checkbox' | 'counter' | 'photo';

interface TaskDefinitionBase {
  readonly id: TaskId;
  readonly title: string;
  readonly subtitle: string;
  readonly emoji: string;
  /** Hard rules cannot be skipped; optional extras still show up on the card. */
  readonly required: boolean;
}

export interface CheckboxTaskDefinition extends TaskDefinitionBase {
  readonly kind: 'checkbox';
}

export interface CounterTaskDefinition extends TaskDefinitionBase {
  readonly kind: 'counter';
  readonly target: number;
  readonly unit: string;
  /** Amount added by the primary "+" action. */
  readonly step: number;
}

export interface PhotoTaskDefinition extends TaskDefinitionBase {
  readonly kind: 'photo';
}

export type TaskDefinition =
  | CheckboxTaskDefinition
  | CounterTaskDefinition
  | PhotoTaskDefinition;

export type CheckboxProgress = { readonly kind: 'checkbox'; readonly completed: boolean };
export type CounterProgress = { readonly kind: 'counter'; readonly amount: number };
export type PhotoProgress = {
  readonly kind: 'photo';
  readonly photoUri: string | null;
  readonly capturedAt: string | null;
};

export type TaskProgress = CheckboxProgress | CounterProgress | PhotoProgress;

/**
 * Commands a screen can send to a task. Keeping them as data (rather than
 * calling setters) means a use case can log, undo or replay them.
 */
export type TaskInput =
  | { readonly type: 'toggle' }
  | { readonly type: 'setChecked'; readonly completed: boolean }
  | { readonly type: 'increment'; readonly amount?: number }
  | { readonly type: 'decrement'; readonly amount?: number }
  | { readonly type: 'setAmount'; readonly amount: number }
  | { readonly type: 'attachPhoto'; readonly photoUri: string; readonly capturedAt: string }
  | { readonly type: 'clearPhoto' };
