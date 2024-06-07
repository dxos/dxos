//
// Copyright 2024 DXOS.org
// Copyright (c) 2015 Joyent Inc.
//

import fs from 'node:fs';

import { log } from '@dxos/log';
import { defaultMap, isNode } from '@dxos/util';

export type EventPhase = 'B' | 'E' | 'X' | 'I';

export interface Event {
  ts: number;
  pid: number;
  tid: number;
  ph?: EventPhase;
  [otherData: string]: any;
}

export interface Fields {
  name: string;
  cat?: string;
  args?: any;
  tid?: number;
  [filedName: string]: any;
}

export interface EventsCollectorParams {
  fields?: Partial<Fields>;
}

/**
 * Inspired by https://github.com/samccone/chrome-trace-event.
 * see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU for details.
 */

export class PerformanceEvents {
  private _currentTid = 0;
  /**
   * Map to keep track of the thread id for each span.
   * Perfetto allows only nested spans on the same thread.
   * We mark each span as a different thread, even though there are no explicit threads in JS.
   *
   * +-----------------------------------------------------------------+
   * |                            trace1                               |
   * | Same     +-----------------------------------------+            | - Not allowed
   * | thread                            trace2                        |
   * |                           +--------------------------------+    |
   * +-----------------------------------------------------------------+
   *
   *
   * +-----------------------------------------------------------------+
   * |                            trace1                               |
   * | Same     +--------------------------------------------------+   | - Allowed
   * | thread                            trace2                        |
   * |                           +--------------------------+          |
   * +-----------------------------------------------------------------+
   *
   *
   * +-----------------------------------------------------------------+
   * |                            trace1                               |
   * | thread1     +-----------------------------------------+         | - Allowed
   * +-----------------------------------------------------------------+
   * |                                   trace2                        |
   * | thread2                   +--------------------------------+    |
   * +-----------------------------------------------------------------+
   */
  private readonly _nameVsTid = new Map<string, number>();

  private readonly _stream: ReadableStream;
  private readonly _fields: Partial<Fields>;
  private _controller?: ReadableStreamDefaultController<string>;

  constructor({ fields }: EventsCollectorParams = {}) {
    this._fields = fields ?? {};

    if (!this._fields.cat) {
      // trace-viewer requires `cat`.
      this._fields.cat = 'default';
    }

    if (!this._fields.args) {
      // trace-viewer requires `args`.
      this._fields.args = {};
    }

    this._stream = new ReadableStream({
      start: (controller) => {
        this._controller = controller;
      },
    });
  }

  public get stream() {
    return this._stream;
  }

  public begin(fields: Fields) {
    return this.mkEventFunc('B')(
      fields,
      defaultMap(this._nameVsTid, fields.name, () => this._currentTid++),
    );
  }

  public end(fields: Fields) {
    return this.mkEventFunc('E')(
      fields,
      defaultMap(this._nameVsTid, fields.name, () => this._currentTid++),
    );
  }

  public completeEvent(fields: Fields) {
    return this.mkEventFunc('X')(fields);
  }

  public instantEvent(fields: Fields) {
    return this.mkEventFunc('I')(fields);
  }

  public mkEventFunc(ph: EventPhase) {
    return (fields: Fields, tid?: number) => {
      this._pushEvent({
        ts: Date.now(),
        pid: isNode() ? process.pid : Math.floor(Math.random() * 100_000),
        tid: tid ?? this._currentTid++,
        ph,
        ...this._fields,
        ...(fields ?? {}),
        args: { ...this._fields.args, ...(fields?.args ?? {}) },
      });
    };
  }

  private _pushEvent(event: Event) {
    this._controller!.enqueue(JSON.stringify(event, null, 2));
  }

  public destroy() {
    try {
      this._controller!.close();
    } catch (err) {
      if (!(err as Error).message.includes('Controller is already closed')) {
        log.catch(err);
      }
    }
  }
}

/**
 * This function produces a file that could be opened in chrome://tracing.
 */
export const writeEventStreamToAFile = ({
  stream,
  path,
  separator = ',\n',
  prefix = '[',
  suffix = ']',
}: {
  stream: ReadableStream;
  path: string;
  separator?: string;
  prefix?: string;
  suffix?: string;
}) => {
  const writer = fs.createWriteStream(path);
  const reader = stream.getReader();
  let firstWrite = true;

  queueMicrotask(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (firstWrite) {
          firstWrite = false;
          writer.write(prefix + value);
          continue;
        }
        writer.write(separator + value);
      }
    } catch (err) {
      log.catch(err);
    }
    writer.write(suffix);
    reader.releaseLock();
  });
};
