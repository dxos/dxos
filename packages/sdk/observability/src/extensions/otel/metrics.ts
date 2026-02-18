//
// Copyright 2024 DXOS.org
//

import { type Meter } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

import { log } from '@dxos/log';
import { type MetricData, TRACE_PROCESSOR } from '@dxos/tracing';

import { type OtelOptions, setDiagLogger } from './otel';

const EXPORT_INTERVAL = 60 * 1000;

export class OtelMetrics {
  private _meterProvider: MeterProvider;
  private _meter: Meter;

  constructor(private readonly options: OtelOptions) {
    // TODO: improve error handling/logging
    //  https://github.com/open-telemetry/opentelemetry-js/issues/4823
    setDiagLogger(options.consoleDiagLogLevel);

    const grafanaMetricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: this.options.endpoint + '/v1/metrics',
        headers: this.options.headers,
      }),
      exportIntervalMillis: EXPORT_INTERVAL,
    });

    this._meterProvider = new MeterProvider({
      resource: this.options.resource,
      readers: [grafanaMetricReader],
    });
    this._meter = this._meterProvider.getMeter('dxos-observability');

    const metrics = {
      // TODO: update metrics names and remove prefix?
      increment: (name: string, value?: number, data?: MetricData) => {
        this.increment(name, value, convertTags(data));
      },
      distribution: (name: string, value: number, data?: MetricData) => {
        this.distribution(name, value, convertTags(data));
      },
      set: (name: string, value: number | string, data?: MetricData) => {
        // Not implemented, not part of Otel spec.
      },
      gauge: (name: string, value: number, data?: MetricData) => {
        this.gauge(name, value, convertTags(data));
      },
    };

    TRACE_PROCESSOR.remoteMetrics.registerProcessor(metrics);
  }

  gauge(name: string, value: number, tags?: any): void {
    const gauge = this._meter.createGauge(name);
    log('otel gauge', { name, value, tags: { ...this.options.getTags(), ...tags } });
    gauge.record(value, { ...this.options.getTags(), ...tags });
  }

  increment(name: string, value?: number, tags?: any): void {
    const counter = this._meter.createCounter(name);
    log('otel counter', { name, value, tags: { ...this.options.getTags(), ...tags } });
    counter.add(value ?? 1, { ...this.options.getTags(), ...tags });
  }

  distribution(name: string, value: number, tags?: any): void {
    const distribution = this._meter.createHistogram(name);
    log('otel distribution', { name, value, tags: { ...this.options.getTags(), ...tags } });
    distribution.record(value, { ...this.options.getTags(), ...tags });
  }

  flush(): Promise<void> {
    return this._meterProvider.forceFlush();
  }

  close(): Promise<void> {
    return this._meterProvider.shutdown();
  }
}

const convertTags = (data?: MetricData) => {
  if (data && data.tags) {
    return Object.entries(data.tags).reduce<{ [key: string]: any }>((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {});
  } else {
    return {};
  }
};
