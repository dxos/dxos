//
// Copyright 2024 DXOS.org
//

import {
  type Attributes,
  type Counter,
  type Gauge,
  type Histogram,
  type MetricOptions,
  type ObservableGauge,
  type ObservableResult,
} from '@opentelemetry/api';
import { AggregationTemporalityPreference, OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import {
  AggregationType,
  InstrumentType,
  MeterProvider,
  PeriodicExportingMetricReader,
  type PushMetricExporter,
  type ViewOptions,
} from '@opentelemetry/sdk-metrics';

import { type CleanupFn } from '@dxos/async';
import { log } from '@dxos/log';
import { type MetricData, type MetricObserver, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions, resolveOtlpUrl, setDiagLogger } from './otel';
import { metricDataToAttributes } from './remote-metrics';

const EXPORT_INTERVAL = 60 * 1000;

const METER_NAME = 'dxos-observability';

/**
 * Second-scale boundaries for the SDK's duration histograms, since the OTel defaults are
 * millisecond-shaped and cap at 10,000. Per-instrument rather than one catch-all: each
 * boundary costs a series, and two views matching one instrument duplicate its stream.
 */
const HISTOGRAM_VIEWS: ViewOptions[] = [
  {
    instrumentType: InstrumentType.HISTOGRAM,
    instrumentName: 'dxos.edge.ws.connect.duration',
    aggregation: {
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      options: { boundaries: [0.1, 0.25, 0.5, 1, 2, 5, 10, 30, 60] },
    },
  },
  {
    // RPC round trips are sub-second when healthy; the tail past ~10s is what matters.
    instrumentType: InstrumentType.HISTOGRAM,
    instrumentName: 'dxos.rpc.queueWait.duration',
    aggregation: {
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      options: { boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10] },
    },
  },
  {
    instrumentType: InstrumentType.HISTOGRAM,
    instrumentName: 'dxos.rpc.service.duration',
    aggregation: {
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      options: { boundaries: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10] },
    },
  },
  {
    instrumentType: InstrumentType.HISTOGRAM,
    instrumentName: 'dxos.echo.sync.episode.duration',
    aggregation: {
      type: AggregationType.EXPLICIT_BUCKET_HISTOGRAM,
      options: { boundaries: [1, 5, 15, 30, 60, 120, 300, 600, 1800, 3600] },
    },
  },
];

export type OtelMetricsOptions = OtelOptions & {
  /** Test seam: replaces the OTLP exporter. */
  exporter?: PushMetricExporter;
  /**
   * Register with `TRACE_PROCESSOR.remoteMetrics` to receive instrument calls made in this
   * realm. Default true. The worker-side sink disables it: its records arrive over the
   * port, and per-connection registration would export any worker-local metric once per
   * connected realm.
   */
  registerTraceProcessor?: boolean;
};

export class OtelMetrics {
  private _meterProvider: MeterProvider;
  // Cached because re-creating an instrument per sample is pure allocation; one map per kind
  // keeps the lookup typed without a cast.
  readonly #counters = new Map<string, Counter>();
  readonly #gauges = new Map<string, Gauge>();
  readonly #histograms = new Map<string, Histogram>();
  readonly #observableGauges = new Map<string, ObservableGauge>();
  readonly #processor: Parameters<typeof TRACE_PROCESSOR.remoteMetrics.registerProcessor>[0];

  constructor(private readonly options: OtelMetricsOptions) {
    // TODO: improve error handling/logging
    //  https://github.com/open-telemetry/opentelemetry-js/issues/4823
    setDiagLogger(options.consoleDiagLogLevel);

    const metricReader = new PeriodicExportingMetricReader({
      exporter:
        options.exporter ??
        new OTLPMetricExporter({
          url: resolveOtlpUrl(this.options.endpoint + '/v1/metrics'),
          headers: this.options.headers,
          // Delta because a cumulative counter restarting at 0 on every client reload reads
          // downstream as a counter reset.
          temporalityPreference: AggregationTemporalityPreference.DELTA,
        }),
      exportIntervalMillis: EXPORT_INTERVAL,
    });

    this._meterProvider = new MeterProvider({
      resource: this.options.resource,
      readers: [metricReader],
      views: HISTOGRAM_VIEWS,
    });

    this.#processor = {
      // TODO: update metrics names and remove prefix?
      increment: (name: string, value?: number, data?: MetricData) => {
        this.increment(name, value, metricDataToAttributes(data), data);
      },
      distribution: (name: string, value: number, data?: MetricData) => {
        this.distribution(name, value, metricDataToAttributes(data), data);
      },
      set: (_name: string, _value: number | string, _data?: MetricData) => {
        // Not implemented, not part of Otel spec.
      },
      gauge: (name: string, value: number, data?: MetricData) => {
        this.gauge(name, value, metricDataToAttributes(data), data);
      },
      observe: (name: string, callback: MetricObserver, data?: MetricData) => {
        return this.observe(name, callback, metricDataToAttributes(data), data);
      },
    };

    if (options.registerTraceProcessor ?? true) {
      TRACE_PROCESSOR.remoteMetrics.registerProcessor(this.#processor);
    }
  }

  gauge(name: string, value: number, tags?: Attributes, data?: MetricData): void {
    const gauge = this.#cached(this.#gauges, name, data, (options) => this.#meter.createGauge(name, options));
    const attributes = { ...this.options.getTags(), ...tags };
    log('otel gauge', { name, value, tags: attributes });
    gauge.record(value, attributes);
  }

  increment(name: string, value?: number, tags?: Attributes, data?: MetricData): void {
    const counter = this.#cached(this.#counters, name, data, (options) => this.#meter.createCounter(name, options));
    const attributes = { ...this.options.getTags(), ...tags };
    log('otel counter', { name, value, tags: attributes });
    counter.add(value ?? 1, attributes);
  }

  distribution(name: string, value: number, tags?: Attributes, data?: MetricData): void {
    const histogram = this.#cached(this.#histograms, name, data, (options) =>
      this.#meter.createHistogram(name, options),
    );
    // Built once: this runs per RPC now that RpcTiming publishes through it, so two tag spreads
    // and two getTags() calls per record were allocation on a hot path.
    const attributes = { ...this.options.getTags(), ...tags };
    log('otel distribution', { name, value, tags: attributes });
    histogram.record(value, attributes);
  }

  /**
   * Registers a callback read once per export interval.
   * Tags resolve inside the callback because identity tags arrive asynchronously after startup,
   * so capturing them at registration would pin the metric to the empty tag set.
   */
  observe(name: string, callback: MetricObserver, tags?: Attributes, data?: MetricData): CleanupFn {
    const gauge = this.#cached(this.#observableGauges, name, data, (options) =>
      this.#meter.createObservableGauge(name, options),
    );

    const observe = (result: ObservableResult) => {
      const value = callback();
      if (value === undefined || !Number.isFinite(value)) {
        return;
      }

      const attributes = { ...this.options.getTags(), ...tags };
      log('otel observable gauge', { name, value, tags: attributes });
      result.observe(value, attributes);
    };

    gauge.addCallback(observe);
    return () => gauge.removeCallback(observe);
  }

  flush(): Promise<void> {
    return this._meterProvider.forceFlush();
  }

  close(): Promise<void> {
    // Detach before shutdown, or later observations attach to this closed provider.
    TRACE_PROCESSOR.remoteMetrics.unregisterProcessor(this.#processor);
    this.#counters.clear();
    this.#gauges.clear();
    this.#histograms.clear();
    this.#observableGauges.clear();
    return this._meterProvider.shutdown();
  }

  get #meter() {
    return this._meterProvider.getMeter(METER_NAME);
  }

  /** Returns the cached instrument; the first caller's unit/description wins, as OTel itself does. */
  #cached<T>(
    cache: Map<string, T>,
    name: string,
    data: MetricData | undefined,
    create: (options: MetricOptions) => T,
  ): T {
    const existing = cache.get(name);
    if (existing) {
      return existing;
    }

    const instrument = create({ unit: data?.unit, description: data?.description });
    cache.set(name, instrument);
    return instrument;
  }
}

