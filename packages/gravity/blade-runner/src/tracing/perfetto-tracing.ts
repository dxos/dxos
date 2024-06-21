//
// Copyright 2024 DXOS.org
//
import fs from 'node:fs';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR } from '@dxos/tracing';

import { PerfettoEvents } from './perfetto-events';

export const PERFETTO_EVENTS = new PerfettoEvents();

export const registerPerfettoTracer = () => {
  TRACE_PROCESSOR.remoteTracing.registerProcessor({
    startSpan: ({ name }) => {
      PERFETTO_EVENTS.begin({ name });
      return {
        end: () => PERFETTO_EVENTS.end({ name }),
      };
    },
  });
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
