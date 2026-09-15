import type { Unsubscribe } from '@core/types/Brand';

/**
 * Observer pattern with a typed channel map.
 *
 * Use cases publish facts ("a day was completed"); side effects such as
 * haptics, notifications and analytics subscribe. Neither knows about the other,
 * so a new reaction never means editing a use case.
 */
export interface EventBus<TEventMap extends object> {
  publish<K extends keyof TEventMap>(type: K, payload: TEventMap[K]): void;
  subscribe<K extends keyof TEventMap>(
    type: K,
    handler: (payload: TEventMap[K]) => void,
  ): Unsubscribe;
}

export class InMemoryEventBus<TEventMap extends object>
  implements EventBus<TEventMap>
{
  private readonly handlers = new Map<keyof TEventMap, Set<(payload: never) => void>>();

  publish<K extends keyof TEventMap>(type: K, payload: TEventMap[K]): void {
    const listeners = this.handlers.get(type);
    if (!listeners) return;
    // Copy first: a handler may unsubscribe itself while we iterate.
    for (const handler of [...listeners]) {
      (handler as (value: TEventMap[K]) => void)(payload);
    }
  }

  subscribe<K extends keyof TEventMap>(
    type: K,
    handler: (payload: TEventMap[K]) => void,
  ): Unsubscribe {
    const listeners = this.handlers.get(type) ?? new Set();
    listeners.add(handler as (payload: never) => void);
    this.handlers.set(type, listeners);
    return () => {
      listeners.delete(handler as (payload: never) => void);
      if (listeners.size === 0) this.handlers.delete(type);
    };
  }
}
