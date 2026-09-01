//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import type * as OtelLogSink from '@dxos/observability/OtelLogSink';
import type * as OtelMetricsSink from '@dxos/observability/OtelMetricsSink';
import type * as OtelSpanSink from '@dxos/observability/OtelSpanSink';

// Direct module import: the util barrel would pull the whole config/observability graph into
// this worker's bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type ObservabilityWorkerMessage } from '../util/worker-log-processor';

// Observability worker: owns log persistence (queue, flush timer, chunked IDB writes, eviction —
// see DX-1224) and, once a connection sends its `otel-*-init` messages, OTLP export of that
// connection's logs, metrics, and spans. Everything runs on this worker's own event loop, so
// persistence and export keep going while a producing realm is blocked by a long synchronous
// task. `WorkerLogProcessor` and the Otel extension are the sending side.

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

/** Caps messages buffered while a sink module import is in flight. */
const MAX_PENDING = 5_000;

type Tags = { type: 'otel-tags'; tags: Record<string, string> };
type Flush = { type: 'otel-flush' };

/**
 * One lazily-imported export pipeline. `init` starts the (one-shot) module load; messages
 * delivered before it resolves are buffered in order, bounded by {@link MAX_PENDING}. A
 * failed load drops export for this connection — IDB persistence is unaffected.
 */
const lazySink = <TInit, TMessage>(
  load: (init: TInit) => Promise<(message: TMessage) => void>,
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
      } else if (pending !== undefined && pending.length < MAX_PENDING) {
        pending.push(message);
      }
    },
  };
};

// Flushes are fire-and-forget, mirroring the sender's pagehide semantics; a failed export
// retries on the sink's own timer.
const fireFlush = (result: Promise<void>): void => {
  void result.catch(() => {});
};

// One worker per producing realm, so the sinks below are that realm's — its resource
// identity (process type, session id) arrives with the init messages.
const createMessageHandler = (): ((event: MessageEvent<ObservabilityWorkerMessage>) => void) => {
  const logs = lazySink<OtelLogSink.Init, string | Tags | Flush>((init) =>
    import('@dxos/observability/OtelLogSink').then(({ Sink }) => {
      const sink = new Sink(init);
      return (message) => (typeof message === 'string' ? sink.append(message) : sink.handleMessage(message));
    }),
  );
  const metrics = lazySink<OtelMetricsSink.Init, OtelMetricsSink.Metric | Tags | Flush>((init) =>
    import('@dxos/observability/OtelMetricsSink').then(({ Sink }) => {
      const sink = new Sink(init);
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
  );
  const spans = lazySink<OtelSpanSink.Init, OtelSpanSink.Span | Flush>((init) =>
    import('@dxos/observability/OtelSpanSink').then(({ Sink }) => {
      const sink = new Sink(init);
      return (message) => (message.type === 'otel-span' ? sink.append(message) : fireFlush(sink.flush()));
    }),
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
        void store.flush();
        logs.deliver({ type: 'otel-flush' });
        metrics.deliver({ type: 'otel-flush' });
        spans.deliver({ type: 'otel-flush' });
        break;
      case 'otel-init':
        logs.init(data);
        break;
      case 'otel-metrics-init':
        metrics.init(data);
        break;
      case 'otel-traces-init':
        spans.init(data);
        break;
      case 'otel-metric':
        metrics.deliver(data);
        break;
      case 'otel-span':
        spans.deliver(data);
        break;
      case 'otel-tags':
        logs.deliver(data);
        metrics.deliver(data);
        break;
      case 'otel-flush':
        logs.deliver(data);
        metrics.deliver(data);
        spans.deliver(data);
        break;
    }
  };
};

globalThis.onmessage = createMessageHandler();
