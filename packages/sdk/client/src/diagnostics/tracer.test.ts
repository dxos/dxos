//
// Copyright 2023 DXOS.org
//

import { describe, test } from '@dxos/test';
import { defaultMap } from '@dxos/util';

/**
 * Tracer events form a graph.
 */
export type Event = {
  id: string;
  timestamp?: number;
  period?: Event[];
  value?: number;
};

export class Log {}

export class Tracer {
  private readonly _events = new Map<string, Event[]>();

  constructor(private readonly _parent?: Tracer) {}

  branch(id: string): Tracer {
    this.emit(id);
    return new Tracer(this);
  }

  // TODO(burdon): Hierarchical events.
  emit(id: string) {
    if (this._parent) {
      this._parent.emit(id);
    } else {
      defaultMap(this._events, id, []).push({ id, timestamp: Date.now() });
    }
  }
}

// TODO(burdon): Map reduce across graph.

describe('Tracer', () => {
  test.only('simple time series', () => {
    // TODO(burdon): Tie to context?
    const root = new Tracer();

    root.emit('foo');
    root.emit('foo');

    {
      const sub = root.branch('bar'); // foo.bar
      sub.emit('processing'); // foo.bar.processing
      sub.emit('closed'); // foo.bar.closed
    }

    console.log(root);

    // foo
    // foo
    // bar: [ processing, closed ]
  });
});
