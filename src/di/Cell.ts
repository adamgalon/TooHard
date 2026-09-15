/** Tiny mutable holder, used to give adapters a live view of a preference. */
export class Cell<T> {
  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(next: T): void {
    this.value = next;
  }
}
