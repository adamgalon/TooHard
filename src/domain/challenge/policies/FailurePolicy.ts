import type { ChallengeProgram } from '@domain/challenge/ChallengeProgram';
import type { CalendarDate } from '@domain/value-objects/CalendarDate';

export type FailurePolicyId = 'strict-restart' | 'forgiving';

export interface MissedDayContext {
  readonly program: ChallengeProgram;
  readonly missedDate: CalendarDate;
  readonly dayNumber: number;
  /** How many days of the current attempt were fully completed. */
  readonly completedDays: number;
}

export type MissedDayOutcome =
  | { readonly kind: 'restart'; readonly reason: string }
  | { readonly kind: 'record'; readonly reason: string };

/**
 * Strategy pattern for the single rule that defines the genre: what a missed
 * day costs. `Challenge` asks the policy instead of branching on programme ids.
 */
export interface FailurePolicy {
  readonly id: FailurePolicyId;
  readonly label: string;
  onDayMissed(context: MissedDayContext): MissedDayOutcome;
}

export class StrictRestartPolicy implements FailurePolicy {
  readonly id = 'strict-restart' as const;
  readonly label = 'Miss a task, restart at day 1';

  onDayMissed(context: MissedDayContext): MissedDayOutcome {
    return {
      kind: 'restart',
      reason: `Day ${context.dayNumber} was left incomplete, so the attempt resets.`,
    };
  }
}

export class ForgivingPolicy implements FailurePolicy {
  readonly id = 'forgiving' as const;
  readonly label = 'Miss a day, keep your progress';

  onDayMissed(context: MissedDayContext): MissedDayOutcome {
    return {
      kind: 'record',
      reason: `Day ${context.dayNumber} was missed. The run continues.`,
    };
  }
}

export class FailurePolicyRegistry {
  private readonly policies = new Map<FailurePolicyId, FailurePolicy>();

  register(policy: FailurePolicy): this {
    this.policies.set(policy.id, policy);
    return this;
  }

  resolve(id: FailurePolicyId): FailurePolicy {
    const policy = this.policies.get(id);
    if (!policy) throw new Error(`No failure policy registered for "${id}".`);
    return policy;
  }
}

export const createDefaultFailurePolicyRegistry = (): FailurePolicyRegistry =>
  new FailurePolicyRegistry().register(new StrictRestartPolicy()).register(new ForgivingPolicy());
