/**
 * Specification pattern.
 *
 * Business rules ("this day counts as complete", "this attempt has failed")
 * become first-class objects that can be combined, named and unit-tested
 * without dragging a repository or a React component along.
 */
export interface Specification<T> {
  readonly description: string;
  isSatisfiedBy(candidate: T): boolean;
}

abstract class ComposableSpecification<T> implements Specification<T> {
  abstract readonly description: string;
  abstract isSatisfiedBy(candidate: T): boolean;

  and(other: Specification<T>): Specification<T> {
    return new AndSpecification(this, other);
  }

  or(other: Specification<T>): Specification<T> {
    return new OrSpecification(this, other);
  }

  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AndSpecification<T> extends ComposableSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  get description(): string {
    return `(${this.left.description} AND ${this.right.description})`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) && this.right.isSatisfiedBy(candidate);
  }
}

class OrSpecification<T> extends ComposableSpecification<T> {
  constructor(
    private readonly left: Specification<T>,
    private readonly right: Specification<T>,
  ) {
    super();
  }

  get description(): string {
    return `(${this.left.description} OR ${this.right.description})`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.left.isSatisfiedBy(candidate) || this.right.isSatisfiedBy(candidate);
  }
}

class NotSpecification<T> extends ComposableSpecification<T> {
  constructor(private readonly inner: Specification<T>) {
    super();
  }

  get description(): string {
    return `NOT ${this.inner.description}`;
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}

/** Builds a composable specification from a plain predicate. */
export const specify = <T>(
  description: string,
  predicate: (candidate: T) => boolean,
): Specification<T> & { and(o: Specification<T>): Specification<T> } => {
  class InlineSpecification extends ComposableSpecification<T> {
    readonly description = description;
    isSatisfiedBy = predicate;
  }
  return new InlineSpecification();
};
