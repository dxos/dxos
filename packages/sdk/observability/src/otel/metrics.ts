//
// Copyright 2024 DXOS.org
//

import { type Attributes, type ObservableGauge } from '@opentelemetry/api';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { type OtelOptions } from './otel';

const EXPORT_INTERVAL = 60 * 1000;

type SynchronousGauge = {
  gauge: ObservableGauge<Attributes>;
  nextValue: number;
  nextTags?: any;
};

export class OtelMetrics {
  private _meterProvider: MeterProvider;
  private _gauges = new Map<string, SynchronousGauge>();

  constructor(private readonly options: OtelOptions) {
    // TODO: improve error handling/logging
    //  https://github.com/open-telemetry/opentelemetry-js/issues/4823
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
  }

  gauge(name: string, value: number, tags?: any) {
    const meter = this._meterProvider.getMeter('dxos-observability');
    const observableGauge = this._gauges.get(name);

    const mergedTags = { ...this.options.getTags(), ...tags };
    if (!observableGauge) {
      const synchronousGauge = {
        gauge: meter.createObservableGauge(name),
        nextValue: value,
        nextTags: mergedTags,
      };
      synchronousGauge.gauge.addCallback((observerResult) => {
        observerResult.observe(synchronousGauge.nextValue, synchronousGauge.nextTags);
      });
      this._gauges.set(name, synchronousGauge);
    } else {
      observableGauge.nextTags = mergedTags;
      observableGauge.nextValue = value;
    }
  }

  flush() {
    return this._meterProvider.forceFlush();
  }

  close() {
    return this._meterProvider.shutdown();
  }
}
