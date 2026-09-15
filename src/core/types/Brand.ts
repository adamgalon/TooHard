declare const brand: unique symbol;

/**
 * Nominal typing helper. `Brand<string, 'ChallengeId'>` is assignable to
 * `string`, but a raw `string` is not assignable to it — so identifiers and
 * calendar dates cannot be mixed up by accident.
 */
export type Brand<T, B extends string> = T & { readonly [brand]: B };

export type Unsubscribe = () => void;

/** Recursively read-only view of a value, used for state exposed to React. */
export type DeepReadonly<T> = T extends (infer R)[]
  ? readonly DeepReadonly<R>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
