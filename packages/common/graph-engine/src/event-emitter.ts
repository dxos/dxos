//
// Copyright 2026 DXOS.org
//

type EventListener<T> = (value: T) => void;

export type EventHandle = () => void;

/**
 * Single-event emitter. Subscribe via `on()`; returns an unsubscribe function.
 */
export class EventEmitter<T> {
  readonly #listeners = new Set<EventListener<T>>();

  clear(): void {
    this.#listeners.clear();
  }

  on(listener: EventListener<T>): EventHandle {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(value: T): void {
    this.#listeners.forEach((listener) => listener(value));
  }
}
