//
// Copyright 2024 DXOS.org
// Copyright (c) 2015 Joyent Inc.
//

/**
 * Inspired by https://github.com/samccone/chrome-trace-event.
 * see https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtYMH4h6I0nSsKchNAySU for details.
 */

import fs from 'node:fs';

import { log } from '@dxos/log';

export type EventPhase = 'B' | 'E' | 'X' | 'I';

export interface Event {
  ts: number;
  pid: number;
  tid: number;
  ph?: EventPhase;
  [otherData: string]: any;
}

export interface Fields {
  cat?: string;
  args?: any;
  [filedName: string]: any;
}

export interface EventsCollectorParams {
  fields?: Fields;
}

export class PerformanceEvents {
  private readonly _stream: ReadableStream;
  private readonly _fields: Fields;
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
    return this.mkEventFunc('B')(fields);
  }

  public end(fields: Fields) {
    return this.mkEventFunc('E')(fields);
  }

  public completeEvent(fields: Fields) {
    return this.mkEventFunc('X')(fields);
  }

  public instantEvent(fields: Fields) {
    return this.mkEventFunc('I')(fields);
  }

  public mkEventFunc(ph: EventPhase) {
    return (fields?: Fields) => {
      this._pushEvent({
        ...evCommon(),
        ...this._fields,
        ...(fields ?? {}),
        ph,
        args: { ...this._fields.args, ...(fields?.args ?? {}) },
      });
    };
  }

  private _pushEvent(event: Event) {
    this._controller!.enqueue(JSON.stringify(event, null, 2));
  }

  public destroy() {
    this._controller!.close();
  }
}

export const writeEventStreamToAFile = ({
  stream,
  path,
  separator = ',\n',
  prefix = '[\n',
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
        if (firstWrite) {
          firstWrite = false;
          writer.write(prefix);
        }
        // TODO(dmaretskyi): Find a way to enforce backpressure on AM-repo.
        const { done, value } = await reader.read();
        if (done) {
          break;
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

const evCommon = (): Event => {
  const ts = Date.now();
  return {
    ts,
    pid: process.pid,
    tid: 0, // no meaningful tid for node.js
  };
};
