//
// Copyright 2026 DXOS.org
//

// Loaded on demand from the support-ticket path: it pulls the OTel log SDK, which must not ride on
// the root barrel of everyone importing this package.

import { LogLevel } from '@dxos/log';

import { type OtelDestination } from '../otel/otel';
import * as OtelLogSink from '../otel/OtelLogSink';

/**
 * Records per export request. The dump is bounded (tens of MB at most) but far exceeds the live
 * processor's queue, so it is fed in slices with a flush between them instead of all at once.
 */
const FLUSH_BATCH_SIZE = 1_000;

export type FlushSupportLogsOptions = {
  destination: OtelDestination;
  /** `service.name`, `service.version`, and the like; the same ones the live stream carries. */
  resourceAttributes: Record<string, string>;
  /** Stamped on every record: the id the PostHog Logs link on the ticket or issue filters on. */
  attributes: Record<string, string>;
};

/**
 * Ships a JSONL log dump (the same lines the IndexedDB store holds) to PostHog Logs as one OTLP
 * stream, every level included, keeping each line's original timestamp. Resolves with the number
 * of lines sent. Failures propagate; the caller decides whether the ticket flow cares.
 */
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
