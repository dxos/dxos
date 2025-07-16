//
// Copyright 2025 DXOS.org
//

import fs from 'node:fs';

import { log } from '@dxos/log';

import { type Event as PerfettoEvent } from '../tracing';

export class TraceReader {
  private readonly _events: PerfettoEvent[] = [];

  get events() {
    return this._events;
  }

  async addFile(path: string) {
    log.info('adding file', { path });
    let file = fs.readFileSync(path, 'utf8');
    if (!file.endsWith(']') && !file.endsWith(']\n')) {
      file += ']';
    }
    const events = JSON.parse(file);
    this._events.push(...events);
    log.info('added file', { path, events });
  }
}
