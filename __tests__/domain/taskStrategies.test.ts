import { TaskIds, type CounterTaskDefinition, type TaskDefinition } from '@domain/tasks/Task';
import { createDefaultTaskStrategyRegistry } from '@domain/tasks/TaskStrategyRegistry';

const registry = createDefaultTaskStrategyRegistry();

const water: CounterTaskDefinition = {
  id: TaskIds.unsafe('water'),
  kind: 'counter',
  title: 'Water',
  subtitle: '',
  emoji: '💧',
  required: true,
  target: 3.8,
  unit: 'L',
  step: 0.25,
};

const diet: TaskDefinition = {
  id: TaskIds.unsafe('diet'),
  kind: 'checkbox',
  title: 'Diet',
  subtitle: '',
  emoji: '🥗',
  required: true,
};

describe('CounterTaskStrategy', () => {
  const strategy = registry.resolve('counter');

  it('increments by the definition step and never drops below zero', () => {
    const zero = strategy.initial(water);
    const up = strategy.apply(water, zero, { type: 'increment' });
    expect(up.ok && up.value).toEqual({ kind: 'counter', amount: 0.25 });

    const down = strategy.apply(water, zero, { type: 'decrement' });
    expect(down.ok && down.value).toEqual({ kind: 'counter', amount: 0 });
  });

  it('is satisfied at the target and caps the ratio when overshooting', () => {
    const full = { kind: 'counter', amount: 5 } as const;
    expect(strategy.isSatisfied(water, full)).toBe(true);
    expect(strategy.completionRatio(water, full)).toBe(1);
  });

  it('refuses commands that belong to another kind', () => {
    const result = strategy.apply(water, strategy.initial(water), { type: 'toggle' });
    expect(result.ok).toBe(false);
  });
});

describe('CheckboxTaskStrategy', () => {
  const strategy = registry.resolve('checkbox');

  it('toggles and reports satisfaction', () => {
    const initial = strategy.initial(diet);
    expect(strategy.isSatisfied(diet, initial)).toBe(false);

    const toggled = strategy.apply(diet, initial, { type: 'toggle' });
    expect(toggled.ok && strategy.isSatisfied(diet, toggled.value)).toBe(true);
  });
});

describe('PhotoTaskStrategy', () => {
  const strategy = registry.resolve('photo');
  const photo: TaskDefinition = { ...diet, kind: 'photo', id: TaskIds.unsafe('progress-photo') };

  it('requires a non-empty uri', () => {
    const empty = strategy.apply(photo, strategy.initial(photo), {
      type: 'attachPhoto',
      photoUri: '  ',
      capturedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(empty.ok).toBe(false);
  });

  it('is satisfied once a photo is attached and cleared again on removal', () => {
    const attached = strategy.apply(photo, strategy.initial(photo), {
      type: 'attachPhoto',
      photoUri: 'file://a.jpg',
      capturedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(attached.ok && strategy.isSatisfied(photo, attached.value)).toBe(true);

    const cleared =
      attached.ok && strategy.apply(photo, attached.value, { type: 'clearPhoto' });
    expect(cleared && cleared.ok && strategy.isSatisfied(photo, cleared.value)).toBe(false);
  });
});
