//
// Copyright 2021 DXOS.org
//

type EventListener<T> = (value: T) => void;

export type EventHandle = () => void;

export class EventEmitter<T> {
  private readonly _listeners = new Set<EventListener<T>>();

  clear() {
    this._listeners.clear();
  }

  on(onEvent: EventListener<T>): EventHandle {
    this._listeners.add(onEvent);
    return () => this._listeners.delete(onEvent);
  }

  public emit(value: T): void {
    this._listeners.forEach((listener) => listener(value));
  }
}
