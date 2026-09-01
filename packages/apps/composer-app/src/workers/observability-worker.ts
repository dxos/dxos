//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import { type OtelLogSinkInit, type OtelLogSinkMessage } from '@dxos/observability/otel-log-sink';
import { type OtelMetricRecord, type OtelMetricsSinkInit } from '@dxos/observability/otel-metrics-sink';

// Not the `../util` barrel: it re-exports config, pulling @dxos/client into this bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type ObservabilityWorkerMessage } from '../util/worker-log-processor';

// Observability worker: owns the queue, flush timer, chunked IDB writes and eviction, so log
// persistence never depends on the sending thread's event loop turning (see DX-1224).
// `WorkerLogProcessor` is the sending side.
//
// On `otel-init` / `otel-metrics-init` (sent by the Otel observability extension in the
// producing realm) the worker additionally exports to the OTLP endpoint — logs by parsing
// the lines it already receives (`OtelLogSink`), metrics from forwarded instrument calls
// (`OtelMetricsSink`) — from its own event loop, so export keeps flowing while the producer
// is blocked by a long synchronous task. The sink modules are imported lazily:
// telemetry-disabled sessions never load the OTel SDK.

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

/** Caps records buffered while a sink module import is in flight. */
const MAX_BUFFERED_RECORDS = 5_000;

type Control = Exclude<OtelLogSinkMessage, OtelLogSinkInit>;
type Flush = Extract<Control, { type: 'otel-flush' }>;

type Consume<TMessage> = (message: TMessage) => void;
type Pipeline<TInit, TMessage> = { init: (init: TInit) => void; deliver: Consume<TMessage> };

const lazySink = <TInit, TMessage>(
  load: (init: TInit) => Promise<Consume<TMessage>>,
  isRecord: (message: TMessage) => boolean,
): Pipeline<TInit, TMessage> => {
  let deliver: ((message: TMessage) => void) | undefined;
  let pending: TMessage[] | undefined;
  let pendingRecords = 0;
  return {
    init: (init) => {
      if (deliver !== undefined || pending !== undefined) {
        return;
      }
      pending = [];
      pendingRecords = 0;
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
      } else if (pending !== undefined && (!isRecord(message) || pendingRecords < MAX_BUFFERED_RECORDS)) {
        pending.push(message);
        if (isRecord(message)) {
          pendingRecords++;
        }
      }
    },
  };
};

// Fire-and-forget, mirroring the sender's pagehide semantics; a failed export retries on the
// sink's own timer.
const fireFlush = (result: Promise<void>): void => {
  void result.catch(() => {});
};

const createMessageHandler = (): ((event: MessageEvent<ObservabilityWorkerMessage>) => void) => {
  const logs = lazySink<OtelLogSinkInit, string | Control>(
    (init) =>
      import('@dxos/observability/otel-log-sink').then(({ OtelLogSink }) => {
        const sink = new OtelLogSink(init);
        return (message) => (typeof message === 'string' ? sink.append(message) : sink.handleMessage(message));
      }),
    (message) => typeof message === 'string',
  );
  const metrics = lazySink<OtelMetricsSinkInit, OtelMetricRecord | Control>(
    (init) =>
      import('@dxos/observability/otel-metrics-sink').then(({ OtelMetricsSink }) => {
        const sink = new OtelMetricsSink(init);
        return (message) => {
          switch (message.type) {
            case 'otel-metric':
              return sink.append(message);
            case 'otel-tags':
              return sink.setTags(message.tags);
            case 'otel-flush':
              return fireFlush(sink.flush());
          }
        };
      }),
    (message) => message.type === 'otel-metric',
  );

  return (event: MessageEvent<ObservabilityWorkerMessage>): void => {
    const data = event.data;
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
        metrics.deliver({ type: 'otel-flush' });
        break;
      case 'otel-init':
        logs.init(data);
        break;
      case 'otel-metrics-init':
        metrics.init(data);
        break;
      case 'otel-metric':
        metrics.deliver(data);
        break;
      case 'otel-tags':
      case 'otel-flush':
        logs.deliver(data);
        metrics.deliver(data);
        break;
    }
  };
};

globalThis.onmessage = createMessageHandler();
