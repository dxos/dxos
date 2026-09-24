//
// Copyright 2024 DXOS.org
//

import fs from 'node:fs';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR, type TracingBackend } from '@dxos/tracing';

import { PerfettoEvents } from './perfetto-events.ts';

export const PERFETTO_EVENTS = new PerfettoEvents();

/**
 * Records every span as perfetto events. Forwards spans to `next` as well, since `TRACE_PROCESSOR` holds a
 * single backend and installing this one would otherwise replace it (the span export, for one).
 */
export const registerPerfettoTracer = (next?: TracingBackend) => {
  TRACE_PROCESSOR.tracingBackend = {
    startSpan: (options) => {
      PERFETTO_EVENTS.begin({ name: options.name });
      const span = next?.startSpan(options);
      return {
        ...span,
        end: (endTime) => {
          PERFETTO_EVENTS.end({ name: options.name });
          span?.end(endTime);
        },
      };
    },
  };
};

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
