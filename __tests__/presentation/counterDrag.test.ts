import { counterValueAt } from '@presentation/components/TaskCard';

// Water: 3.8 L in 0.25 L steps — deliberately not a whole number of steps.
const WATER = { width: 200, target: 3.8, step: 0.25 };
// Reading: 10 pages in 1-page steps.
const READING = { width: 200, target: 10, step: 1 };

const water = (x: number) => counterValueAt(x, WATER.width, WATER.target, WATER.step);
const reading = (x: number) => counterValueAt(x, READING.width, READING.target, READING.step);

describe('counterValueAt', () => {
  it('maps the ends of the track to empty and the goal', () => {
    expect(water(0)).toBe(0);
    expect(water(200)).toBe(3.8);
  });

  it('clamps a touch that runs past either end', () => {
    expect(water(-40)).toBe(0);
    expect(water(999)).toBe(3.8);
  });

  it('snaps to the task step rather than a raw fraction', () => {
    // Halfway along 3.8 L is 1.9, which is not a multiple of 0.25.
    expect(water(100)).toBe(2);
    expect(reading(55)).toBe(3);
  });

  it('keeps 0.25 steps free of floating-point noise', () => {
    // 0.1 + 0.2 arithmetic would surface here as 2.7500000000000004.
    const values = [20, 40, 60, 80, 120, 140, 160].map(water);
    for (const value of values) {
      expect(Number.isInteger(value * 100)).toBe(true);
    }
  });

  it('lands exactly on a target that is not a whole number of steps', () => {
    // 15.2 steps of 0.25 L: without the final-half-step rule this stops at
    // 3.75 and the task never completes by dragging.
    expect(water(199)).toBe(3.8);
    expect(water(196)).toBe(3.8);
  });

  it('does not reach the goal from clearly short of the end', () => {
    expect(water(150)).toBeLessThan(3.8);
  });

  it('returns zero before the track has been measured', () => {
    expect(counterValueAt(50, 0, 3.8, 0.25)).toBe(0);
  });
});
