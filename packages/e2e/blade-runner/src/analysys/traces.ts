//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';

import { log } from '@dxos/log';

import { type Event as PerfettoEvent } from '../tracing';

type Trace = {
  name: string;
  begin?: PerfettoEvent;
  end?: PerfettoEvent;
  duration?: number;
};

export class TraceReader {
  private readonly _events: PerfettoEvent[] = [];
  private _traces: Record<string, Trace> = {};

  get events() {
    return this._events;
  }

  getTraces(prefix?: string): Trace[] {
    if (!prefix) {
      return Object.values(this._traces);
    }

    return Object.values(this._traces).filter((trace) => trace.name.startsWith(prefix));
  }

  async addFile(path: string) {
    let file = fs.readFileSync(path, 'utf8');
    if (!file.endsWith(']') && !file.endsWith(']\n')) {
      file += ']';
    }
    const events = JSON.parse(file);
    this._events.push(...events);
    await this.propageteEvents(events);
  }

  async propageteEvents(events: PerfettoEvent[]) {
    for (const event of events) {
      if (event.ph === 'B') {
        this._traces[event.name] = { name: event.name, begin: event, duration: 0 };
      }

      if (event.ph === 'E') {
        this._traces[event.name].end = event;
        if (this._traces[event.name].begin) {
          this._traces[event.name].duration = event.ts - this._traces[event.name].begin!.ts;
        }
      }
    }

    return this._traces;
  }
}
