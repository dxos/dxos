//
// Copyright 2021 DXOS.org
//

interface Listeners {
  [key: string]: Function[];
}

export type EventHandle = { off: () => void }

export class EventEmitter {
  private readonly _events: Listeners = {};

  on (name: string, cb: Function): EventHandle {
    (this._events[name] || (this._events[name] = [])).push(cb);

    return {
      off: () => this._events[name] && this._events[name].splice(this._events[name].indexOf(cb) >>> 0, 1)
    };
  }

  public emit (name: string, ...args: any[]): void {
    (this._events[name] || []).forEach(fn => fn(...args));
  }
}
