//
// Copyright 2024 DXOS.org
//

import { type Attributes, type Meter, type ObservableGauge } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { log } from '@dxos/log';
import { TRACE_PROCESSOR, type MetricData } from '@dxos/tracing';

import { type OtelOptions, setDiagLogger } from './otel';

const EXPORT_INTERVAL = 60 * 1000;

type SynchronousGauge = {
  gauge: ObservableGauge<Attributes>;
  nextValue: number;
  nextTags?: any;
};

export class OtelMetrics {
  private _meterProvider: MeterProvider;
  private _meter: Meter;
  private _gauges = new Map<string, SynchronousGauge>();

  constructor(private readonly options: OtelOptions) {
    // TODO: improve error handling/logging
    //  https://github.com/open-telemetry/opentelemetry-js/issues/4823
    setDiagLogger(options.consoleDiagLogLevel);
    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: this.options.serviceName,
        [SEMRESATTRS_SERVICE_VERSION]: this.options.serviceVersion,
      }),
    );

    const grafanaMetricReader = new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: this.options.endpoint + '/v1/metrics',
        headers: {
          Authorization: this.options.authorizationHeader,
        },
      }),
      exportIntervalMillis: EXPORT_INTERVAL,
    });

    this._meterProvider = new MeterProvider({
      resource,
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

  gauge(name: string, value: number, tags?: any) {
    const gauge = this._meter.createGauge(name);
    log('otel gauge', { name, value, tags: { ...this.options.getTags(), ...tags } });
    gauge.record(value, { ...this.options.getTags(), ...tags });
  }

  increment(name: string, value?: number, tags?: any) {
    const counter = this._meter.createCounter(name);
    log('otel counter', { name, value, tags: { ...this.options.getTags(), ...tags } });
    counter.add(value ?? 1, { ...this.options.getTags(), ...tags });
  }

  distribution(name: string, value: number, tags?: any) {
    const distribution = this._meter.createHistogram(name);
    log('otel distribution', { name, value, tags: { ...this.options.getTags(), ...tags } });
    distribution.record(value, { ...this.options.getTags(), ...tags });
  }

  flush() {
    return this._meterProvider.forceFlush();
  }

  close() {
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
