//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import { type OtelLogSink, type OtelLogSinkMessage } from '@dxos/observability/otel-log-sink';
import { type OtelMetricRecord, type OtelMetricsSink } from '@dxos/observability/otel-metrics-sink';

// Direct module import: the util barrel would pull the whole config/observability graph into
// this worker's bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type TelemetryWorkerMessage } from '../util/worker-log-processor';

// Telemetry worker: owns the queue, flush timer, chunked IDB writes and eviction, so log
// persistence never depends on the sending thread's event loop turning (see DX-1224).
// `WorkerLogProcessor` is the sending side. Handles both dedicated (`onmessage`) and shared
// (`onconnect`) worker scopes.
//
// On `otel-init` / `otel-metrics-init` (sent by the Otel observability extension in the
// producing realm) the worker additionally exports to the OTLP endpoint — logs by parsing
// the lines it already receives (`OtelLogSink`), metrics from forwarded instrument calls
// (`OtelMetricsSink`) — from its own event loop, so export keeps flowing while the producer
// is blocked by a long synchronous task. The sink modules are imported lazily:
// telemetry-disabled sessions never load the OTel SDK.

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

/** Caps messages buffered while a sink module import is in flight. */
const MAX_PENDING = 5_000;

// Per connection: a SharedWorker serves one producing realm per port, each with its own
// resource identity (process type, session id), so sink state cannot be shared.
const createMessageHandler = (): ((event: MessageEvent<TelemetryWorkerMessage>) => void) => {
  let logSink: OtelLogSink | undefined;
  let metricsSink: OtelMetricsSink | undefined;
  // Set when the matching init arrives; each holds messages in arrival order until the
  // dynamic import resolves, then replays them into the sink. Messages arriving before any
  // init are persisted (logs) or dropped (metrics) — same as the in-process pipelines,
  // which only start once observability initializes.
  let pendingLogs: (string | Exclude<OtelLogSinkMessage, { type: 'otel-init' }>)[] | undefined;
  let pendingMetrics: OtelMetricRecord[] | undefined;

  const toLogSink = (message: string | Exclude<OtelLogSinkMessage, { type: 'otel-init' }>): void => {
    if (logSink) {
      if (typeof message === 'string') {
        logSink.append(message);
      } else {
        logSink.handleMessage(message);
      }
    } else if (pendingLogs && pendingLogs.length < MAX_PENDING) {
      pendingLogs.push(message);
    }
  };

  // Fire-and-forget, mirroring the sender's pagehide semantics; a failed export retries on
  // the sink's own timer.
  const flushMetrics = (): void => {
    void metricsSink?.flush().catch(() => {});
  };

  return (event: MessageEvent<TelemetryWorkerMessage>): void => {
    const data = event.data;
    // Hot path: a bare string is one pre-serialized JSONL line.
    if (typeof data === 'string') {
      store.append(data);
      toLogSink(data);
      return;
    }
    if (data == null) {
      return;
    }
    switch (data.type) {
      case 'flush': {
        // Fire-and-forget, mirroring the sender's pagehide semantics; `flush` never rejects.
        void store.flush();
        toLogSink({ type: 'otel-flush' });
        flushMetrics();
        break;
      }
      case 'otel-init': {
        if (logSink !== undefined || pendingLogs !== undefined) {
          break;
        }
        pendingLogs = [];
        void import('@dxos/observability/otel-log-sink')
          .then(({ OtelLogSink }) => {
            logSink = new OtelLogSink(data);
            for (const message of pendingLogs ?? []) {
              toLogSink(message);
            }
            pendingLogs = undefined;
          })
          .catch(() => {
            // No OTel log export for this connection; IDB persistence is unaffected.
            pendingLogs = undefined;
          });
        break;
      }
      case 'otel-metrics-init': {
        if (metricsSink !== undefined || pendingMetrics !== undefined) {
          break;
        }
        pendingMetrics = [];
        void import('@dxos/observability/otel-metrics-sink')
          .then(({ OtelMetricsSink }) => {
            metricsSink = new OtelMetricsSink(data);
            for (const record of pendingMetrics ?? []) {
              metricsSink.append(record);
            }
            pendingMetrics = undefined;
          })
          .catch(() => {
            // No OTel metric export for this connection.
            pendingMetrics = undefined;
          });
        break;
      }
      case 'otel-metric': {
        if (metricsSink) {
          metricsSink.append(data);
        } else if (pendingMetrics && pendingMetrics.length < MAX_PENDING) {
          pendingMetrics.push(data);
        }
        break;
      }
      case 'otel-tags': {
        // A tags update racing the metrics-sink import is dropped for metrics — the window
        // is the ms-scale module load at startup, well before identity tags arrive.
        toLogSink(data);
        metricsSink?.setTags(data.tags);
        break;
      }
      case 'otel-flush': {
        toLogSink(data);
        flushMetrics();
        break;
      }
    }
  };
};

if ('onconnect' in globalThis) {
  // SharedWorker scope — one connection (port) per context.
  onconnect = (event: MessageEvent) => {
    for (const port of event.ports) {
      port.onmessage = createMessageHandler();
    }
  };
} else {
  globalThis.onmessage = createMessageHandler();
}
