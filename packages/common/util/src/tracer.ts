//
// Copyright 2023 DXOS.org
//

import { defaultMap } from './map';

const getMicroseconds = () => {
  const [seconds, nano] = process.hrtime();
  return seconds * 1e6 + nano / 1e3;
};

/**
 * Tracer events form a graph.
 */
export type Event = {
  id: string;
  timestamp: number;
  duration?: number; // Microseconds.
  value?: any;
};

/**
 * Event sink.
 */
export class Tracer {
  private readonly _events = new Map<string, Event[]>();

  private _recording = false;

  // TODO(burdon): Start/stop methods for recording data? By id?
  //  Alternatively, enable subscriptions to track/compute series.

  // TODO(burdon): Hierarchical traces?

  get recording() {
    return this._recording;
  }

  get(id: string, filter?: Record<string, any>): Event[] | undefined {
    const events = this._events.get(id);
    if (filter) {
      return events?.filter((event) => Object.entries(filter).every(([key, value]) => event?.value[key] === value));
    }

    return events;
  }

  clear() {
    this._events.clear();
  }

  start() {
    this._recording = true;
    return this;
  }

  stop() {
    this._recording = false;
    return this;
  }

  emit(id: string, value?: any) {
    this._post(this._createEvent(id, value));
  }

  mark(id: string, value?: any): { end: () => void } {
    const event = this._createEvent(id, value);
    return {
      end: () => {
        event.duration = Math.floor(getMicroseconds() - event.timestamp!);
        this._post(event);
      },
    };
  }

  private _createEvent(id: string, value?: any): Event {
    const event: Event = { id, timestamp: getMicroseconds() };
    if (value !== undefined) {
      event.value = value;
    }

    return event;
  }

  private _post(event: Event) {
    if (this._recording) {
      defaultMap(this._events, event.id, []).push(event);
    }
  }
}

// TODO(burdon): Factor out (move to @dxos/log?)
// TODO(burdon): Global singleton (e.g., `trace()`) or part of client services?
export const tracer = new Tracer();
