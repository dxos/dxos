//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import { type OtelLogSink, type OtelLogSinkMessage } from '@dxos/observability/otel-log-sink';

// Direct module import: the util barrel would pull the whole config/observability graph into
// this worker's bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type ObservabilityWorkerMessage } from '../util/worker-log-processor';

// Observability worker: owns the queue, flush timer, chunked IDB writes and eviction, so log
// persistence never depends on the sending thread's event loop turning (see DX-1224).
// `WorkerLogProcessor` is the sending side.
//
// On `otel-init` (sent by the Otel observability extension in the producing realm) the worker
// additionally exports the lines it receives to the OTLP endpoint via an `OtelLogSink` — from
// its own event loop, so export keeps flowing while the producer is blocked by a long
// synchronous task. The sink module is imported lazily: telemetry-disabled sessions never
// load the OTel SDK.

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

/** Caps messages buffered while the sink module import is in flight. */
const MAX_PENDING = 5_000;

const createMessageHandler = (): ((event: MessageEvent<ObservabilityWorkerMessage>) => void) => {
  let sink: OtelLogSink | undefined;
  // Set when `otel-init` arrives; holds messages in arrival order until the dynamic import
  // resolves, then replays them into the sink. Lines arriving before any `otel-init` are
  // persisted but not exported — same as the in-process pipeline, which only starts
  // exporting once observability initializes.
  let pending: (string | Exclude<OtelLogSinkMessage, { type: 'otel-init' }>)[] | undefined;

  /**
   * Hands a message to the sink, or queues it in arrival order while the module import is in
   * flight. Only records count against the cap: control messages are few, and dropping one
   * loses a flush rather than a line.
   */
  const deliver = (message: string | Exclude<OtelLogSinkMessage, { type: 'otel-init' }>): void => {
    if (sink) {
      if (typeof message === 'string') {
        sink.append(message);
      } else {
        sink.handleMessage(message);
      }
    } else if (pending && (typeof message !== 'string' || pending.length < MAX_PENDING)) {
      pending.push(message);
    }
  };

  return (event: MessageEvent<ObservabilityWorkerMessage>): void => {
    const data = event.data;
    // Hot path: a bare string is one pre-serialized JSONL line.
    if (typeof data === 'string') {
      store.append(data);
      deliver(data);
      return;
    }
    if (data == null) {
      return;
    }
    switch (data.type) {
      case 'flush': {
        // Fire-and-forget, mirroring the sender's pagehide semantics; `flush` never rejects.
        void store.flush();
        deliver({ type: 'otel-flush' });
        break;
      }
      case 'otel-init': {
        if (sink !== undefined || pending !== undefined) {
          break;
        }
        pending = [];
        void import('@dxos/observability/otel-log-sink')
          .then(({ OtelLogSink }) => {
            sink = new OtelLogSink(data);
            pending?.forEach(deliver);
            pending = undefined;
          })
          .catch(() => {
            // No OTel export for this connection; IDB persistence is unaffected.
            pending = undefined;
          });
        break;
      }
      default: {
        deliver(data);
      }
    }
  };
};

globalThis.onmessage = createMessageHandler();
