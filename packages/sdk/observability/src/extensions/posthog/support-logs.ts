//
// Copyright 2026 DXOS.org
//

import { LogLevel } from '@dxos/log';

import { type OtelDestination } from '../otel/otel';
import * as OtelLogSink from '../otel/OtelLogSink';

const FLUSH_BATCH_SIZE = 1_000;

export type FlushSupportLogsOptions = {
  destination: OtelDestination;
  resourceAttributes: Record<string, string>;
  attributes: Record<string, string>;
};

/** Ships a JSONL log dump to PostHog Logs as one OTLP stream, returning the number of lines sent. */
export const flushSupportLogs = async (ndjson: string, options: FlushSupportLogsOptions): Promise<number> => {
  const sink = new OtelLogSink.Sink(
    {
      type: 'otel-init',
      destinations: [options.destination],
      resourceAttributes: options.resourceAttributes,
      logLevel: LogLevel.TRACE,
      tags: options.attributes,
    },
    { batch: { maxQueueSize: FLUSH_BATCH_SIZE * 2, maxExportBatchSize: FLUSH_BATCH_SIZE } },
  );

  let count = 0;
  try {
    for (const line of ndjson.split('\n')) {
      if (line.length === 0) {
        continue;
      }
      sink.append(line);
      count++;
      if (count % FLUSH_BATCH_SIZE === 0) {
        await sink.flush();
      }
    }
    await sink.flush();
  } finally {
    await sink.close();
  }
  return count;
};
