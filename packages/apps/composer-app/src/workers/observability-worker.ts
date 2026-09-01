//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import { type OtelLogSinkInit } from '@dxos/observability/otel-log-sink';

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

/** Caps records buffered while the sink module import is in flight. */
const MAX_PENDING = 5_000;

type Tags = { type: 'otel-tags'; tags: Record<string, string> };
type Flush = { type: 'otel-flush' };

/**
 * One lazily-imported export pipeline. `init` starts the (one-shot) module load; messages
 * delivered before it resolves are buffered in order. Only records count against
 * {@link MAX_PENDING}: control messages are few, and dropping one loses a flush rather than a
 * record. A failed load drops export for this connection — IDB persistence is unaffected.
 */
const lazySink = <TInit, TMessage>(
  load: (init: TInit) => Promise<(message: TMessage) => void>,
  isRecord: (message: TMessage) => boolean,
): { init: (init: TInit) => void; deliver: (message: TMessage) => void } => {
  let deliver: ((message: TMessage) => void) | undefined;
  let pending: TMessage[] | undefined;
  return {
    init: (init) => {
      if (deliver !== undefined || pending !== undefined) {
        return;
      }
      pending = [];
      load(init)
        .then((loaded) => {
          deliver = loaded;
          pending?.forEach(loaded);
          pending = undefined;
        })
        .catch(() => {
          pending = undefined;
        });
    },
    deliver: (message) => {
      if (deliver !== undefined) {
        deliver(message);
      } else if (pending !== undefined && (!isRecord(message) || pending.length < MAX_PENDING)) {
        pending.push(message);
      }
    },
  };
};

// One worker per producing realm, so the sink below is that realm's — its resource identity
// (process type, session id) arrives with the init message.
const createMessageHandler = (): ((event: MessageEvent<ObservabilityWorkerMessage>) => void) => {
  const logs = lazySink<OtelLogSinkInit, string | Tags | Flush>(
    (init) =>
      import('@dxos/observability/otel-log-sink').then(({ OtelLogSink }) => {
        const sink = new OtelLogSink(init);
        return (message) => (typeof message === 'string' ? sink.append(message) : sink.handleMessage(message));
      }),
    (message) => typeof message === 'string',
  );

  return (event: MessageEvent<ObservabilityWorkerMessage>): void => {
    const data = event.data;
    // Hot path: a bare string is one pre-serialized JSONL line.
    if (typeof data === 'string') {
      store.append(data);
      logs.deliver(data);
      return;
    }
    if (data == null) {
      return;
    }
    switch (data.type) {
      case 'flush':
        // Fire-and-forget, mirroring the sender's pagehide semantics; `flush` never rejects.
        void store.flush();
        logs.deliver({ type: 'otel-flush' });
        break;
      case 'otel-init':
        logs.init(data);
        break;
      case 'otel-tags':
      case 'otel-flush':
        logs.deliver(data);
        break;
    }
  };
};

globalThis.onmessage = createMessageHandler();
