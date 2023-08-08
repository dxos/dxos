//
// Copyright 2023 DXOS.org
//

import { defaultMap } from '@dxos/util';

/**
 * Tracer events form a graph.
 */
export type Event = {
  id: string;
  timestamp: number;
  duration?: number;
  value?: any;
};

/**
 * Event sink.
 */
// TODO(burdon): Factor out (move to @dxos/log?)
// TODO(burdon): Global singleton (e.g., `trace()`).
export class Tracer {
  private readonly _events = new Map<string, Event[]>();

  // TODO(burdon): Start/stop methods for recording data? By id?
  //  Alternatively, enable subscriptions to track/compute series.

  // TODO(burdon): Hierarchical traces?

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

  // TODO(burdon): Start/stop timer.
  emit(id: string, value?: any) {
    const event: Event = { id, timestamp: Date.now() };
    if (value !== undefined) {
      event.value = value;
    }

    defaultMap(this._events, id, []).push(event);

    return {
      done: () => {
        event.duration = Date.now() - event.timestamp!;
      },
    };
  }
}
