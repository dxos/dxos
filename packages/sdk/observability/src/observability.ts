//
// Copyright 2023 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Client, type Config } from '@dxos/client';
import { type ClientServices, type Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/network-manager';
import { DeviceKind, type NetworkStatus, Platform } from '@dxos/protocols/proto/dxos/client/services';
import { isNode } from '@dxos/util';

import buildSecrets from './cli-observability-secrets.json';
import { type IPData, getTelemetryIdentifier, mapSpaces } from './helpers';
import { type OtelLogs, type OtelMetrics, type OtelTraces } from './otel';
import { type SegmentTelemetry, type EventOptions, type PageOptions } from './segment';
import { type InitOptions, type captureException as SentryCaptureException } from './sentry';
import { type SentryLogProcessor } from './sentry/sentry-log-processor';

const SPACE_METRICS_MIN_INTERVAL = 1000 * 60; // 1 minute
const SPACE_TELEMETRY_MIN_INTERVAL = 1000 * 60 * 60; // 1 hour
const NETWORK_METRICS_MIN_INTERVAL = 1000 * 60 * 5; // 5 minutes

// Secrets? EnvironmentConfig?

export type ObservabilitySecrets = {
  DX_ENVIRONMENT: string | null;
  DX_RELEASE: string | null;
  SENTRY_DESTINATION: string | null;
  TELEMETRY_API_KEY: string | null;
  IPDATA_API_KEY: string | null;
  OTEL_ENDPOINT: string | null;
  OTEL_AUTHORIZATION: string | null;
};

export type Mode = 'basic' | 'full' | 'disabled';
export type TagScope = 'errors' | 'telemetry' | 'metrics' | 'all';

export type ObservabilityOptions = {
  /// The webapp (e.g. 'composer.dxos.org'), 'cli', or 'agent'.
  namespace: string;
  mode: Mode;
  // TODO(nf): make platform a required extension?
  // platform: Platform;
  release?: string;
  environment?: string;
  config?: Config;
  secrets?: Record<string, string>;
  group?: string;

  telemetry?: {
    batchSize?: number;
  };

  errorLog?: {
    sentryInitOptions?: InitOptions;
  };
};

/*
 * Observability provides a common interface for error logging, metrics, and telemetry.
 * It currently provides these capabilities using Sentry, OpenTelemetry, and Segment.
 */
export class Observability {
  // TODO(wittjosiah): Generic metrics interface.
  private _otelMetrics?: OtelMetrics;
  private _otelTraces?: OtelTraces;
  // TODO(wittjosiah): Generic telemetry interface.
  private _telemetryBatchSize: number;
  private _telemetry?: SegmentTelemetry;
  // TODO(wittjosiah): Generic error logging interface.
  private _sentryLogProcessor?: SentryLogProcessor;
  private _otelLogs?: OtelLogs;
  private _errorReportingOptions?: InitOptions;
  private _captureException?: typeof SentryCaptureException;
  private _captureUserFeedback?: (name: string, email: string, message: string) => Promise<void>;
  private _setTag?: (key: string, value: string) => void;

  private _secrets: ObservabilitySecrets;
  private _namespace: string;
  private _mode: Mode;
  private _config?: Config;
  private _group?: string;
  // TODO(nf): accept upstream context?
  private _ctx = new Context();
  private _tags = new Map<string, { value: string; scope: TagScope }>();
  private _lastNetworkStatus?: NetworkStatus;

  // TODO(nf): make platform a required extension?
  constructor({
    namespace,
    environment,
    release,
    config,
    secrets,
    group,
    mode,
    telemetry,
    errorLog,
  }: ObservabilityOptions) {
    this._namespace = namespace;
    this._mode = mode;
    this._config = config;
    this._group = group;
    this._secrets = this._loadSecrets(config, secrets);
    this._telemetryBatchSize = telemetry?.batchSize ?? 30;
    this._errorReportingOptions = errorLog?.sentryInitOptions;

    if (this._group) {
      this.setTag('group', this._group);
    }
    this.setTag('namespace', this._namespace);
    environment && this.setTag('environment', environment);
    release && this.setTag('release', release);
    this.setTag('mode', this._mode);
  }

  get mode() {
    return this._mode;
  }

  get group() {
    return this._group;
  }

  get enabled() {
    return this._mode !== 'disabled';
  }

  private _loadSecrets(config: Config | undefined, secrets?: Record<string, string>) {
    if (isNode()) {
      const mergedSecrets = {
        ...(buildSecrets as ObservabilitySecrets),
        ...secrets,
      };

      process.env.DX_ENVIRONMENT && (mergedSecrets.DX_ENVIRONMENT = process.env.DX_ENVIRONMENT);
      process.env.DX_RELEASE && (mergedSecrets.DX_RELEASE = process.env.DX_RELEASE);
      // TODO: prefix these with DX_?
      process.env.SENTRY_DESTINATION && (mergedSecrets.SENTRY_DESTINATION = process.env.SENTRY_DESTINATION);
      process.env.TELEMETRY_API_KEY && (mergedSecrets.TELEMETRY_API_KEY = process.env.TELEMETRY_API_KEY);
      process.env.IPDATA_API_KEY && (mergedSecrets.IPDATA_API_KEY = process.env.IPDATA_API_KEY);
      process.env.DX_OTEL_ENDPOINT && (mergedSecrets.OTEL_ENDPOINT = process.env.DX_OTEL_ENDPOINT);
      process.env.DX_OTEL_AUTHORIZATION && (mergedSecrets.OTEL_AUTHORIZATION = process.env.DX_OTEL_AUTHORIZATION);

      return mergedSecrets;
    } else {
      log('config', { rtc: this._secrets, config });
      return {
        DX_ENVIRONMENT: config?.get('runtime.app.env.DX_ENVIRONMENT'),
        DX_RELEASE: config?.get('runtime.app.env.DX_RELEASE'),
        SENTRY_DESTINATION: config?.get('runtime.app.env.DX_SENTRY_DESTINATION'),
        TELEMETRY_API_KEY: config?.get('runtime.app.env.DX_TELEMETRY_API_KEY'),
        IPDATA_API_KEY: config?.get('runtime.app.env.DX_IPDATA_API_KEY'),
        OTEL_ENDPOINT: config?.get('runtime.app.env.DX_OTEL_ENDPOINT'),
        OTEL_AUTHORIZATION: config?.get('runtime.app.env.DX_OTEL_AUTHORIZATION'),
        ...secrets,
      };
    }
  }

  async initialize() {
    await this._initMetrics();
    await this._initTelemetry();
    await this._initErrorLogs();
    await this._initTraces();
  }

  async close() {
    const closes: Promise<void>[] = [];
    this._telemetry && closes.push(this._telemetry.close());
    this._otelMetrics && closes.push(this._otelMetrics.close());
    this._otelLogs && closes.push(this._otelLogs.close());

    await Promise.all(closes);
    await this._ctx.dispose();

    // TODO(wittjosiah): Remove telemetry, etc. scripts.
  }

  setMode(mode: Mode) {
    this._mode = mode;
  }

  //
  // Tags
  //

  setTag(key: string, value: string, scope?: TagScope) {
    if (this.enabled && (scope === undefined || scope === 'all' || scope === 'errors')) {
      this._setTag?.(key, value);
    }
    if (!scope) {
      scope = 'all';
    }
    this._tags.set(key, { value, scope });
  }

  getTag(key: string) {
    return this._tags.get(key);
  }

  addIPDataTelemetryTags = (ipData: IPData) => {
    this.setTag('city', ipData.city, 'telemetry');
    this.setTag('region', ipData.region, 'telemetry');
    this.setTag('country', ipData.country, 'telemetry');
    ipData.latitude && this.setTag('latitude', ipData.latitude.toString(), 'telemetry');
    ipData.longitude && this.setTag('longitude', ipData.longitude.toString(), 'telemetry');
  };

  // TODO(wittjosiah): Improve privacy of telemetry identifiers. See `getTelemetryIdentifier`.
  async setIdentityTags(clientServices: Partial<ClientServices>) {
    if (clientServices.IdentityService) {
      clientServices.IdentityService.queryIdentity().subscribe((idqr) => {
        if (!idqr?.identity?.identityKey) {
          log('empty response from identity service', { idqr });
          return;
        }
        this.setTag('identityKey', idqr.identity.identityKey.truncate());
      });
    }

    if (clientServices.DevicesService) {
      clientServices.DevicesService.queryDevices().subscribe((dqr) => {
        if (!dqr || !dqr.devices || dqr.devices.length === 0) {
          log('empty response from device service', { device: dqr });
          return;
        }
        invariant(dqr, 'empty response from device service');

        const thisDevice = dqr.devices.find((device) => device.kind === DeviceKind.CURRENT);
        if (!thisDevice) {
          log('no current device', { device: dqr });
          return;
        }
        this.setTag('deviceKey', thisDevice.deviceKey.truncate());
        if (thisDevice.profile?.label) {
          this.setTag('deviceProfile', thisDevice.profile.label);
        }
      });
    }
  }

  //
  // Metrics
  //

  private async _initMetrics() {
    if (this.enabled && this._secrets.OTEL_ENDPOINT && this._secrets.OTEL_AUTHORIZATION) {
      const { OtelMetrics } = await import('./otel');
      this._otelMetrics = new OtelMetrics({
        endpoint: this._secrets.OTEL_ENDPOINT,
        authorizationHeader: this._secrets.OTEL_AUTHORIZATION,
        serviceName: this._namespace,
        serviceVersion: this.getTag('release')?.value ?? '0.0.0',
        getTags: () =>
          Object.fromEntries(
            Array.from(this._tags)
              .filter(([key, value]) => {
                return value.scope === 'all' || value.scope === 'metrics';
              })
              .map(([key, value]) => [key, value.value]),
          ),
      });
      log('otel metrics enabled');
    } else {
      log('otel metrics disabled');
    }
  }

  /**
   * Gauge metric.
   *
   * The default implementation uses OpenTelemetry
   */
  gauge(name: string, value: number | any, extraTags?: any) {
    this._otelMetrics?.gauge(name, value, extraTags);
  }

  // TODO(nf): Refactor into ObservabilityExtensions.

  startNetworkMetrics(clientServices: Partial<ClientServices>) {
    if (!clientServices.NetworkService) {
      return;
    }
    // TODO(nf): support type in debounce()
    const updateSignalMetrics = new Event<NetworkStatus>().debounce(NETWORK_METRICS_MIN_INTERVAL);
    updateSignalMetrics.on(this._ctx, async () => {
      log('send signal metrics');
      (this._lastNetworkStatus?.signaling as NetworkStatus.Signal[]).forEach(({ server, state }) => {
        this.gauge('dxos.client.network.signal.connectionState', state, { server });
      });

      let swarmCount = 0;
      const connectionStates = new Map<string, number>();
      for (const state in ConnectionState) {
        connectionStates.set(state, 0);
      }

      let totalReadBufferSize = 0;
      let totalWriteBufferSize = 0;
      let totalChannelBufferSize = 0;

      this._lastNetworkStatus?.connectionInfo?.forEach((connectionInfo) => {
        swarmCount++;

        for (const conn of connectionInfo.connections ?? []) {
          connectionStates.set(conn.state, (connectionStates.get(conn.state) ?? 0) + 1);
          totalReadBufferSize += conn.readBufferSize ?? 0;
          totalWriteBufferSize += conn.writeBufferSize ?? 0;

          for (const stream of conn.streams ?? []) {
            totalChannelBufferSize += stream.writeBufferSize ?? 0;
          }
        }

        this.gauge('dxos.client.network.swarm.count', swarmCount);
        for (const state in ConnectionState) {
          this.gauge('dxos.client.network.connection.count', connectionStates.get(state) ?? 0, { state });
        }
        this.gauge('dxos.client.network.totalReadBufferSize', totalReadBufferSize);
        this.gauge('dxos.client.network.totalWriteBufferSize', totalWriteBufferSize);
        this.gauge('dxos.client.network.totalChannelBufferSize', totalChannelBufferSize);
      });
    });

    clientServices.NetworkService.queryStatus().subscribe((networkStatus) => {
      this._lastNetworkStatus = networkStatus;
      updateSignalMetrics.emit();
    });

    scheduleTaskInterval(this._ctx, async () => updateSignalMetrics.emit(), NETWORK_METRICS_MIN_INTERVAL);
  }

  startSpacesMetrics(client: Client, namespace: string) {
    // TODO(nf): update subscription on new spaces
    const spaces = client.spaces.get();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    this._ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    const updateSpaceMetrics = new Event<Space>().debounce(SPACE_METRICS_MIN_INTERVAL);
    updateSpaceMetrics.on(this._ctx, async () => {
      log('send space metrics');
      for (const data of mapSpaces(spaces, { truncateKeys: true })) {
        this.gauge('dxos.client.space.members', data.members, { key: data.key });
        this.gauge('dxos.client.space.objects', data.objects, { key: data.key });
        this.gauge('dxos.client.space.epoch', data.epoch, { key: data.key });
        this.gauge('dxos.client.space.currentDataMutations', data.currentDataMutations, { key: data.key });
      }
    });

    const updateSpaceTelemetry = new Event<Space>().debounce(SPACE_TELEMETRY_MIN_INTERVAL);
    updateSpaceTelemetry.on(this._ctx, async () => {
      log('send space telemetry');
      for (const data of mapSpaces(spaces, { truncateKeys: true })) {
        this.event({
          identityId: getTelemetryIdentifier(client),
          name: `${namespace}.space.update`,
          properties: data,
        });
      }
    });

    const subscribeToSpaceUpdate = (space: Space) =>
      space.pipeline.subscribe({
        next: () => {
          updateSpaceMetrics.emit();
          updateSpaceTelemetry.emit();
        },
      });

    spaces.forEach((space) => {
      subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
    });

    client.spaces.subscribe({
      next: async (spaces) => {
        spaces
          .filter((space) => !subscriptions.has(space.key.toHex()))
          .forEach((space) => {
            subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
          });
      },
    });

    scheduleTaskInterval(this._ctx, async () => updateSpaceMetrics.emit(), NETWORK_METRICS_MIN_INTERVAL);
  }

  async startRuntimeMetrics(client: Client, frequency: number = NETWORK_METRICS_MIN_INTERVAL) {
    const platform = await client.services.services.SystemService?.getPlatform();
    invariant(platform, 'platform is required');

    this.setTag('platform_type', Platform.PLATFORM_TYPE[platform.type as number].toLowerCase());
    if (this._mode === 'full') {
      // platform[foo] does not work?
      if (platform.platform) {
        this.setTag('platform', platform.platform);
      }
      if (platform.arch) {
        this.setTag('arch', platform.arch);
      }
      if (platform.runtime) {
        this.setTag('runtime', platform.runtime);
      }
    }

    scheduleTaskInterval(
      this._ctx,
      async () => {
        if (client.services.constructor.name === 'WorkerClientServices') {
          const memory = (window.performance as any).memory;
          if (memory) {
            this.gauge('dxos.client.runtime.heapTotal', memory.totalJSHeapSize);
            this.gauge('dxos.client.runtime.heapUsed', memory.usedJSHeapSize);
            this.gauge('dxos.client.runtime.heapSizeLimit', memory.jsHeapSizeLimit);
          }
        }
        client.services.services.SystemService?.getPlatform()
          .then((platform) => {
            if (platform.memory) {
              this.gauge('dxos.client.services.runtime.rss', platform.memory.rss);
              this.gauge('dxos.client.services.runtime.heapTotal', platform.memory.heapTotal);
              this.gauge('dxos.client.services.runtime.heapUsed', platform.memory.heapUsed);
            }
          })
          .catch((error) => log('platform error', { error }));
      },
      frequency,
    );
  }

  //
  // Telemetry
  //

  private async _initTelemetry() {
    if (this._secrets.TELEMETRY_API_KEY && this._mode !== 'disabled') {
      const { SegmentTelemetry } = await import('./segment');
      this._telemetry = new SegmentTelemetry({
        apiKey: this._secrets.TELEMETRY_API_KEY,
        batchSize: this._telemetryBatchSize,
        getTags: () =>
          Object.fromEntries(
            Array.from(this._tags)
              .filter(([key, value]) => {
                return value.scope === 'all' || value.scope === 'telemetry';
              })
              .map(([key, value]) => [key, value.value]),
          ),
      });
    } else {
      log('segment disabled');
    }
  }

  /**
   * A telemetry event.
   *
   * The default implementation uses Segment.
   */
  event(options: EventOptions) {
    this._telemetry?.event(options);
  }

  /**
   * A telemetry page view.
   *
   * The default implementation uses Segment.
   */
  page(options: PageOptions) {
    this._telemetry?.page(options);
  }

  //
  // Error Logs
  //

  private async _initErrorLogs() {
    if (this._secrets.SENTRY_DESTINATION && this._mode !== 'disabled') {
      const { captureException, captureUserFeedback, init, setTag } = await import('./sentry');
      const { SentryLogProcessor } = await import('./sentry/sentry-log-processor');
      this._captureException = captureException;
      this._captureUserFeedback = captureUserFeedback;

      this._setTag = setTag;

      // TODO(nf): refactor package into this one?
      log.info('Initializing Sentry', {
        dest: this._secrets.SENTRY_DESTINATION,
        options: this._errorReportingOptions,
      });
      this._sentryLogProcessor = new SentryLogProcessor();
      init({
        ...this._errorReportingOptions,
        destination: this._secrets.SENTRY_DESTINATION,
        scrubFilenames: this._mode !== 'full',
        onError: (event) => this._sentryLogProcessor!.addLogBreadcrumbsTo(event),
      });
      // TODO(nf): set platform at instantiation? needed for node.

      // TODO(nf): is this different than passing as properties in options?
      this._tags.forEach((v, k) => {
        if (v.scope === 'all' || v.scope === 'errors') {
          setTag(k, v.value);
        }
      });
    } else {
      log('sentry disabled');
    }

    if (this._secrets.OTEL_ENDPOINT && this._secrets.OTEL_AUTHORIZATION && this._mode !== 'disabled') {
      const { OtelLogs } = await import('./otel');
      this._otelLogs = new OtelLogs({
        endpoint: this._secrets.OTEL_ENDPOINT,
        authorizationHeader: this._secrets.OTEL_AUTHORIZATION,
        serviceName: this._namespace,
        serviceVersion: this.getTag('release')?.value ?? '0.0.0',
        getTags: () =>
          Object.fromEntries(
            Array.from(this._tags)
              .filter(([key, value]) => {
                return value.scope === 'all' || value.scope === 'errors';
              })
              .map(([key, value]) => [key, value.value]),
          ),
      });
      log('otel logs enabled', { namespace: this._namespace });
    } else {
      log('otel logs disabled');
    }
  }

  startErrorLogs() {
    this._sentryLogProcessor && log.runtimeConfig.processors.push(this._sentryLogProcessor.logProcessor);
    this._otelLogs && log.runtimeConfig.processors.push(this._otelLogs.logProcessor);
  }

  startTraces() {
    this._otelTraces && this._otelTraces.start();
  }

  // TODO(nf): refactor init based on providers and their capabilities
  private async _initTraces() {
    if (this._secrets.OTEL_ENDPOINT && this._secrets.OTEL_AUTHORIZATION && this._mode !== 'disabled') {
      const { OtelTraces } = await import('./otel');
      this._otelTraces = new OtelTraces({
        endpoint: this._secrets.OTEL_ENDPOINT,
        authorizationHeader: this._secrets.OTEL_AUTHORIZATION,
        serviceName: this._namespace,
        serviceVersion: this.getTag('release')?.value ?? '0.0.0',
        getTags: () =>
          Object.fromEntries(
            Array.from(this._tags)
              .filter(([key, value]) => {
                return value.scope === 'all' || value.scope === 'metrics';
              })
              .map(([key, value]) => [key, value.value]),
          ),
      });
    }
  }

  /**
   * Manually capture an exception.
   *
   * The default implementation uses Sentry.
   */
  captureException(err: any) {
    if (this.enabled) {
      this._captureException?.(err);
    }
  }

  /**
   * Manually capture user feedback.
   *
   * The default implementation uses Sentry.
   */
  captureUserFeedback(name: string, email: string, message: string) {
    // TODO(Zan): Should this respect telemetry mode? Sending feedback is explicitly user-initiated.
    // - Maybe if telemetry is disable we shouldn't enable replay.
    // - (Check the browser.ts implementation for reference).
    void this._captureUserFeedback?.(name, email, message);
  }
}
