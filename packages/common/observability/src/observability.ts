//
// Copyright 2023 DXOS.org
//

import { Event, scheduleTaskInterval } from '@dxos/async';
import { type Client, type Config } from '@dxos/client';
import { type Space } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/network-manager';
import { DeviceKind, type NetworkStatus, Platform } from '@dxos/protocols/proto/dxos/client/services';
import {
  captureException as sentryCaptureException,
  enableSentryLogProcessor,
  configureTracing as sentryConfigureTracing,
  init as sentryInit,
  type InitOptions,
  setTag as sentrySetTag,
} from '@dxos/sentry';
import { isNode } from '@dxos/util';

import buildSecrets from './cli-observability-secrets.json';
import { DatadogMetrics } from './datadog';
import { SegmentTelemetry, type EventOptions, type PageOptions } from './segment';
import { mapSpaces } from './util';

const SPACE_METRICS_MIN_INTERVAL = 1000 * 60;
// const DATADOG_IDLE_INTERVAL = 1000 * 60 * 5;
const DATADOG_IDLE_INTERVAL = 1000 * 60 * 1;

// TODO(nf): add allowlist for telemetry tags?
const SENTRY_TAGS = ['identityKey', 'username', 'deviceKey', 'group'];

// Secrets? EnvironmentConfig?

export type ObservabilityConfig = {
  DX_ENVIRONMENT: string | null;
  DX_RELEASE: string | null;
  SENTRY_DESTINATION: string | null;
  TELEMETRY_API_KEY: string | null;
  IPDATA_API_KEY: string | null;
  DATADOG_API_KEY: string | null;
  DATADOG_APP_KEY: string | null;
};

export type ObservabilityRuntimeConfig = {
  /// The webapp (e.g. 'composer.dxos.org'), 'cli', or 'agent'.
  namespace: string;
  // TODO(nf): make platform a required extension?
  // platform: Platform;
  config?: Config;
  secrets?: Map<string, string>;
  group?: string;
  mode?: 'basic' | 'full' | 'disabled';
};

/*
 * Observability provides a common interface for error logging, metrics, and telemetry.
 * It currently provides these capabilities using Sentry, Datadog, and Segment.
 */

export class Observability {
  private _datadogmetrics?: DatadogMetrics;
  private _segmentTelemetry?: SegmentTelemetry;
  private config: ObservabilityConfig;
  private _namespace: string;
  private _runtimeConfig?: Config;
  private _mode: 'basic' | 'full' | 'disabled' = 'disabled';
  private _group?: string;
  // TODO(nf): accept upstream context?
  private _ctx = new Context();
  private _tags = new Map<string, string>();
  private _sentryEnabled = false;
  private _telemetryEnabled = false;
  private _metricsEnabled = false;

  // TODO(nf): make platform a required extension?
  constructor({ namespace, config, secrets, group, mode }: ObservabilityRuntimeConfig) {
    this._namespace = namespace;
    this._runtimeConfig = config;
    this._mode = mode ?? 'disabled';
    this._group = group;
    this.config = this._loadSecrets(config, secrets);

    if (this._group) {
      this.setTag('group', this._group);
    }
    this.setTag('namespace', this._namespace);

    if (this._mode === 'full') {
      // TODO(nf): set group and hostname?
    }
  }

  private _loadSecrets(config: Config | undefined, secrets?: Map<string, string>) {
    if (secrets) {
      return {
        DX_ENVIRONMENT: secrets.get('DX_ENVIRONMENT') ?? null,
        DX_RELEASE: secrets.get('DX_RELEASE') ?? null,
        SENTRY_DESTINATION: secrets.get('SENTRY_DESTINATION') ?? null,
        TELEMETRY_API_KEY: secrets.get('TELEMETRY_API_KEY') ?? null,
        IPDATA_API_KEY: secrets.get('IPDATA_API_KEY') ?? null,
        DATADOG_API_KEY: secrets.get('DATADOG_API_KEY') ?? null,
        DATADOG_APP_KEY: secrets.get('DATADOG_APP_KEY') ?? null,
      };
    } else if (isNode()) {
      return buildSecrets as ObservabilityConfig;
    } else {
      invariant(config, 'runtime config is required');
      return {
        DX_ENVIRONMENT: config.get('runtime.app.env.DX_ENVIRONMENT'),
        DX_RELEASE: config.get('runtime.app.env.DX_RELEASE'),
        SENTRY_DESTINATION: config.get('runtime.app.env.DX_SENTRY_DESTINATION'),
        TELEMETRY_API_KEY: config.get('runtime.app.env.DX_TELEMETRY_API_KEY'),
        IPDATA_API_KEY: config.get('runtime.app.env.DX_IPDATA_API_KEY'),
        DATADOG_API_KEY: config.get('runtime.app.env.DX_DATADOG_API_KEY'),
        DATADOG_APP_KEY: config.get('runtime.app.env.DX_DATADOG_APP_KEY'),
      };
      log('config', { rtc: this.config, config });
    }
  }

  /**
   * global kill switch
   */
  public disable() {
    this._mode = 'disabled';
    // TODO(nf): use attributes to indicate enablement?
    this._sentryEnabled = false;
    this._telemetryEnabled = false;
    // TODO(nf): fix?
    this._datadogmetrics = undefined;
  }

  get enabled() {
    return this._mode !== 'disabled';
  }

  public async close() {
    await this._ctx.dispose();
  }

  /******
   * Tags
   ******/
  /**
   * Set a tag for all observability services.
   */
  public setTag(k: string, v: string) {
    if (this._sentryEnabled && SENTRY_TAGS.includes(k)) {
      sentrySetTag(k, v);
    }
    this._tags.set(k, v);
  }

  // TODO(nf): combine with setDeviceTags?
  public async setIdentityTags(client: Client) {
    client.services.services.IdentityService!.queryIdentity().subscribe((idqr) => {
      if (!idqr?.identity?.identityKey) {
        log('empty response from identity service', { idqr });
        return;
      }

      // TODO(nf): check mode
      // TODO(nf): cardinality
      this.setTag('identityKey', idqr?.identity?.identityKey.truncate());
      if (idqr?.identity?.profile?.displayName) {
        this.setTag('username', idqr?.identity?.profile?.displayName);
      }
    });
  }

  public async setDeviceTags(client: Client) {
    client.services.services.DevicesService!.queryDevices().subscribe((dqr) => {

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

  /*******
   Metrics
   *******/

  public initMetrics() {
    if (this.config.DATADOG_API_KEY && this._mode !== 'disabled') {
      this._datadogmetrics = new DatadogMetrics({
        apiKey: this.config.DATADOG_API_KEY,
        getTags: () => this._tags,
        // TODO(nf): move/refactor from telementryContext, needed to read CORS proxy
        config: this._runtimeConfig!,
      });
      this._metricsEnabled = true;
    } else {
      log('datadog disabled');
    }
  }

  get metricsEnabled() {
    return this._metricsEnabled;
  }

  /**
   * Gauge metric
   */
  gauge(name: string, value: number | any, extraTags?: any) {
    this._datadogmetrics?.gauge(name, value, extraTags);
  }

  // TODO(nf): refactor into ObservabilityExtensions?

  public startNetworkMetrics(client: Client) {
    const updateSignalMetrics = new Event<NetworkStatus>();

    // const lcsh = (csp as LocalClientServices).host;
    updateSignalMetrics.on(this._ctx, async (networkStatus) => {
      log('send signal metrics');
      (networkStatus.signaling as NetworkStatus.Signal[]).forEach(({ server, state }) => {
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

      networkStatus.connectionInfo?.forEach((connectionInfo) => {
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
        this.gauge('dxox.client.network.totalReadBufferSize', totalReadBufferSize);
        this.gauge('dxos.client.network.totalWriteBufferSize', totalWriteBufferSize);
        this.gauge('dxos.client.network.totalChannelBufferSize', totalChannelBufferSize);
      });
    });

    client.services.services.NetworkService?.queryStatus().subscribe((networkStatus) => {
      updateSignalMetrics.emit(networkStatus);
    });

    // scheduleTaskInterval(ctx, async () => updateSignalMetrics.emit(), DATADOG_IDLE_INTERVAL);
  }

  public startSpacesMetrics(client: Client) {
    let spaces = client.spaces.get();
    const subscriptions = new Map<string, { unsubscribe: () => void }>();
    this._ctx.onDispose(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));

    const updateSpaceMetrics = new Event<Space>().debounce(SPACE_METRICS_MIN_INTERVAL);
    updateSpaceMetrics.on(this._ctx, async (space) => {
      log('send space update');
      for (const sp of mapSpaces(spaces, { truncateKeys: true })) {
        this.gauge('dxos.client.space.members', sp.members, { key: sp.key });
        this.gauge('dxos.client.space.objects', sp.objects, { key: sp.key });
        this.gauge('dxos.client.space.epoch', sp.epoch, { key: sp.key });
        this.gauge('dxos.client.space.currentDataMutations', sp.currentDataMutations, { key: sp.key });
      }
    });

    const subscribeToSpaceUpdate = (space: Space) =>
      space.pipeline.subscribe({
        next: () => {
          updateSpaceMetrics.emit();
        },
      });

    spaces.forEach((space) => {
      subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
    });

    client.spaces.subscribe({
      next: async () => {
        spaces = client.spaces.get();
        // spaces = await this.getSpaces(this._agent.client);
        spaces
          .filter((space) => !subscriptions.has(space.key.toHex()))
          .forEach((space) => {
            subscriptions.set(space.key.toHex(), subscribeToSpaceUpdate(space));
          });
      },
    });

    scheduleTaskInterval(this._ctx, async () => updateSpaceMetrics.emit(), DATADOG_IDLE_INTERVAL);
  }

  public async startRuntimeMetrics(client: Client, frequency: number = DATADOG_IDLE_INTERVAL) {
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
        log('platform');
        client.services.services.SystemService?.getPlatform()
          .then((platform) => {
            log('platform', { platform });
            if (platform.memory) {
              this.gauge('dxos.client.runtime.rss', platform.memory.rss);
              this.gauge('dxos.client.runtime.heapTotal', platform.memory.heapTotal);
              this.gauge('dxos.client.runtime.heapUsed', platform.memory.heapUsed);
            }
          })
          .catch((error) => log('platform error', { error }));
      },
      frequency,
    );
  }

  /*********
   Telemetry
   *********/

  public initTelemetry(batchSize = 30) {
    if (this.config.TELEMETRY_API_KEY && this._mode !== 'disabled') {
      this._segmentTelemetry = new SegmentTelemetry({
        apiKey: this.config.TELEMETRY_API_KEY,
        batchSize,
        getTags: () => this._tags,
      });
      this._telemetryEnabled = true;
    } else {
      log('segment disabled');
    }
  }

  get telemetryEnabled() {
    return this._telemetryEnabled;
  }

  public telemetryEvent(eo: EventOptions) {
    this._segmentTelemetry?.event(eo);
  }

  public telemetryPage(po: PageOptions) {
    this._segmentTelemetry?.page(po);
  }

  /**********
   Error Logs
   **********/

  // TODO(nf): rename?

  public initSentry(options: Partial<InitOptions>, enableLogProcessor = false) {
    if (this.config.SENTRY_DESTINATION && this._mode !== 'disabled') {
      // TODO(nf): refactor package into this one?
      log.info('Initializing Sentry', {
        dest: this.config.SENTRY_DESTINATION,
        options,
      });
      sentryInit({
        ...options,
        destination: this.config.SENTRY_DESTINATION,
        scrubFilenames: this._mode !== 'full',
      });
      if (options.tracing) {
        sentryConfigureTracing();
      }
      // TODO(nf): set platform at instantiation? needed for node.
      if (enableLogProcessor) {
        enableSentryLogProcessor();
      }


      // TODO(nf): is this different than passing as properties in options?
      this._tags.forEach((v, k) => {
        if (SENTRY_TAGS.includes(k)) {
          sentrySetTag(k, v);
        }
      });
      this._sentryEnabled = true;
    } else {
      log('sentry disabled');
    }
  }

  get sentryEnabled() {
    return this._telemetryEnabled;
  }

  /**
   * Manually capture an exception.
   */
  public captureException(err: any) {
    if (this._sentryEnabled) {
      sentryCaptureException(err);
    }
  }
}
