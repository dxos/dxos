//
// Copyright 2023 DXOS.org
//

import { defaultMap } from './map';

/**
 * Tracer events form a graph.
 */
export type Event = {
  id: string;
  timestamp: number; // ms.
  duration?: number; // ms (float).
  value?: any;
};

/**
 * Event sink.
 */
// TODO(burdon): Reconcile with log.trace.
export class Tracer {
  private readonly _events = new Map<string, Event[]>();

  private _recording = false;

  // TODO(burdon): Start/stop methods for recording data? By id?
  //  Alternatively, enable subscriptions to track/compute series.

  // TODO(burdon): Hierarchical traces?

  get recording() {
    return this._recording;
  }

  keys(): string[] {
    return Array.from(this._events.keys());
  }

  get(id: string, filter?: Record<string, any>): Event[] | undefined {
    const events = this._events.get(id);
    if (filter) {
      return events?.filter((event) => Object.entries(filter).every(([key, value]) => event?.value[key] === value));
    }

    return events;
  }

  clear(): void {
    this._events.clear();
  }

  start(): this {
    this._recording = true;
    return this;
  }

  stop(): this {
    this._recording = false;
    return this;
  }

  emit(id: string, value?: any): void {
    this._post(this._createEvent(id, value));
  }

  mark(id: string, value?: any): { start: number; end: () => void } {
    const event = this._createEvent(id, value);
    const start = performance.now();
    return {
      start,
      end: () => {
        event.duration = performance.now() - start;
        this._post(event);
      },
    };
  }

  private _createEvent(id: string, value?: any): Event {
    const event: Event = { id, timestamp: Date.now() };
    if (value !== undefined) {
      event.value = value;
    }

    return event;
  }

  private _post(event: Event): void {
    if (this._recording) {
      defaultMap(this._events, event.id, []).push(event);
    }
  }
}

// TODO(burdon): Factor out (move to @dxos/log?)
// TODO(burdon): Global singleton (e.g., `trace()`) or part of client services?
export const tracer = new Tracer();
