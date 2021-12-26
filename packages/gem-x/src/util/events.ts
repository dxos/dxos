//
// Copyright 2021 DXOS.org
//

type EventListener<T> = (value: T) => void

export type EventHandle = { off: () => void }

export class EventEmitter<T> {
  private readonly _listeners = new Set<EventListener<T>>();

  clear () {
    this._listeners.clear();
  }

  on (cb: EventListener<T>): EventHandle {
    this._listeners.add(cb);
    return {
      off: () => this._listeners.delete(cb)
    };
  }

  public emit (value: T): void {
    this._listeners.forEach(listener => listener(value));
  }
}
