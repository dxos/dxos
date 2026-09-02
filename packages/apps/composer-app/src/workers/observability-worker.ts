//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';
import type * as OtelLogSink from '@dxos/observability/OtelLogSink';
import type * as OtelMetricsSink from '@dxos/observability/OtelMetricsSink';
import type * as OtelSpanSink from '@dxos/observability/OtelSpanSink';

// Not the `../util` barrel: it re-exports config, pulling @dxos/client into this bundle.
import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES } from '../util/constants';
import { type ObservabilityWorkerMessage } from '../util/worker-log-processor';

const store = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });

const MAX_BUFFERED_RECORDS = 5_000;

type Control = Exclude<OtelLogSink.Message, OtelLogSink.Init>;
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

const fireFlush = (result: Promise<void>): void => {
  void result.catch(() => {});
};

const createMessageHandler = (): ((event: MessageEvent<ObservabilityWorkerMessage>) => void) => {
  let spanSink: OtelSpanSink.Sink | undefined;
  const logs = lazySink<OtelLogSink.Init, string | Control>(
    (init) =>
      import('@dxos/observability/OtelLogSink').then(({ Sink }) => {
        const sink = new Sink(init, { onTraceFlagged: (traceId) => spanSink?.promote(traceId) });
        return (message) => (typeof message === 'string' ? sink.append(message) : sink.handleMessage(message));
      }),
    (message) => typeof message === 'string',
  );
  const metrics = lazySink<OtelMetricsSink.Init, OtelMetricsSink.Metric | Control>(
    (init) =>
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
    (message) => message.type === 'otel-metric',
  );
  const spans = lazySink<OtelSpanSink.Init, OtelSpanSink.Span | Flush>(
    (init) =>
      import('@dxos/observability/OtelSpanSink').then(({ Sink }) => {
        const sink = new Sink(init);
        spanSink = sink;
        return (message) => (message.type === 'otel-span' ? sink.append(message) : fireFlush(sink.flush()));
      }),
    (message) => message.type === 'otel-span',
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
