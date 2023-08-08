//
// Copyright 2023 DXOS.org
//

import { defaultMap } from '@dxos/util';

/**
 * Tracer events form a graph.
 */
export type Event = {
  id: string;
  timestamp?: number;
  duration?: number;
  value?: any;
};

/**
 * Event sink.
 */
// TODO(burdon): Factor out.
// TODO(burdon): Global singleton.
export class Tracer {
  private readonly _events = new Map<string, Event[]>();

  get(id: string, filter?: Record<string, any>) {
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
  emit(id: string, value: any) {
    const event: Event = { id, timestamp: Date.now() };
    if (value !== undefined) {
      event.value = value;
    }

    defaultMap(this._events, id, []).push(event);

    return {
      done: () => {
        event.duration = Date.now() - event.timestamp;
      },
    };
  }
}
