//
// Copyright 2023 DXOS.org
//

import * as Reactivity from '@effect/experimental/Reactivity';
import type * as SqlClient from '@effect/sql/SqlClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import { Event, synchronized } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  ClientServicesProviderResource,
  clientServiceBundle,
} from '@dxos/client-protocol';
import { type ClientServicesHost, type ClientServicesHostProps } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type SignalManager } from '@dxos/messaging';
import { type SwarmNetworkManagerOptions, type TransportFactory, createIceProvider } from '@dxos/network-manager';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { type ServiceBundle } from '@dxos/rpc';
import { layerFile, layerMemory, sqlExportLayer } from '@dxos/sql-sqlite/platform';
import type * as SqlExport from '@dxos/sql-sqlite/SqlExport';
import * as SqliteClient from '@dxos/sql-sqlite/SqliteClient';
import * as SqlTransaction from '@dxos/sql-sqlite/SqlTransaction';
import { trace } from '@dxos/tracing';
import { isBun } from '@dxos/util';

export type LocalClientServicesParams = Omit<ClientServicesHostProps, 'runtime'> & {
  createOpfsWorker?: () => Worker;
  /**
   * Path to SQLite database file for persistent indexing in Node/Bun.
   * If not provided, falls back to in-memory SQLite (indexes lost on restart).
   */
  sqlitePath?: string;
};

/**
 * Creates stand-alone services without rpc.
 */
// TODO(burdon): Rename createLocalServices?
export const fromHost = async (
  config = new Config(),
  params?: LocalClientServicesParams,
): Promise<ClientServicesProvider> => {
  const observabilityGroup = config.get('runtime.client.observabilityGroup');
  const signalTelemetryEnabled = config.get('runtime.client.signalTelemetryEnabled');
  const networking = await setupNetworking(config, {}, () =>
    signalTelemetryEnabled
      ? {
          ...services.signalMetadataTags,
          ...(observabilityGroup ? { group: observabilityGroup } : {}),
        }
      : {},
  );

  const services = new LocalClientServices({ config, ...networking, ...params });
  return services;
};

/**
 * Creates signal manager and transport factory based on config.
 * These are used to create a WebRTC network manager connected to the specified signal server.
 */
const setupNetworking = async (
  config: Config,
  options: Partial<SwarmNetworkManagerOptions> = {},
  signalMetadata?: () => void,
): Promise<{
  signalManager?: SignalManager;
  transportFactory: TransportFactory;
}> => {
  const { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } = await import('@dxos/messaging');
  const { createRtcTransportFactory, MemoryTransportFactory } = await import('@dxos/network-manager');

  const signals = config.get('runtime.services.signaling');
  const edgeFeatures = config.get('runtime.client.edgeFeatures');
  if (signals || edgeFeatures?.signaling) {
    const {
      signalManager = edgeFeatures?.signaling || !signals
        ? undefined // EdgeSignalManager needs EdgeConnection and will be created in service-host
        : new WebsocketSignalManager(signals, signalMetadata),
      // TODO(wittjosiah): P2P networking causes seg fault in bun currently.
      transportFactory = isBun()
        ? MemoryTransportFactory
        : createRtcTransportFactory(
            { iceServers: config.get('runtime.services.ice') },
            config.get('runtime.services.iceProviders') &&
              createIceProvider(config.get('runtime.services.iceProviders')!),
          ),
    } = options;

    return {
      signalManager,
      transportFactory,
    };
  }

  // TODO(burdon): Should not provide a memory signal manager since no shared context.
  //  Use TestClientBuilder for shared memory tests.
  log('P2P network is not configured.');
  const signalManager = new MemorySignalManager(new MemorySignalManagerContext());
  const transportFactory = MemoryTransportFactory;
  return {
    signalManager,
    transportFactory,
  };
};

/**
 * Starts a local instance of the service host.
 */
@trace.resource({ annotation: ClientServicesProviderResource })
export class LocalClientServices implements ClientServicesProvider {
  readonly closed = new Event<Error | undefined>();
  private readonly _ctx = new Context();
  private readonly _params: LocalClientServicesParams;
  private readonly _createOpfsWorker?: () => Worker;
  private readonly _sqlitePath?: string;
  private _host?: ClientServicesHost;
  private _opfsWorker?: Worker;
  private _runtime?: ManagedRuntime.ManagedRuntime<
    SqlTransaction.SqlTransaction | SqlClient.SqlClient | SqlExport.SqlExport,
    never
  >;
  signalMetadataTags: any = {
    runtime: 'local-client-services',
  };

  @trace.info()
  private _isOpen = false;

  constructor(params: LocalClientServicesParams) {
    this._params = params;
    this._createOpfsWorker = params.createOpfsWorker;
    this._sqlitePath = params.sqlitePath;
    // TODO(nf): extract
    if (typeof window === 'undefined' || typeof window.location === 'undefined') {
      // TODO(nf): collect ClientServices metadata as param?
      this.signalMetadataTags.origin = 'undefined';
    } else {
      // SocketSupply native app
      if ((globalThis as any).__args) {
        this.signalMetadataTags.runtime = 'native';
        this.signalMetadataTags.origin = window.location.origin;
        // TODO(nf): access socket app metadata?
      } else {
        this.signalMetadataTags.origin = window.location.origin;
      }
    }
  }

  get descriptors(): ServiceBundle<ClientServices> {
    return clientServiceBundle;
  }

  get services(): Partial<ClientServices> {
    return this._host?.services ?? {};
  }

  get host(): ClientServicesHost | undefined {
    return this._host;
  }

  @synchronized
  async open(): Promise<void> {
    if (this._isOpen) {
      return;
    }

    const { ClientServicesHost } = await import('@dxos/client-services');
    const { setIdentityTags } = await import('@dxos/messaging');

    // Create SQLite runtime layer. The choice is driven by `runtime.client.storage.sqlite_mode`
    // in config — the presence of `createOpfsWorker` or `sqlitePath` options does not influence
    // the decision. Missing prerequisites throw instead of silently falling back.
    //
    // TODO(mykola): Worker and runtime leak if _host.open() fails below.
    //   If _host.open() throws, _isOpen remains false, and close() returns early without
    //   cleaning up _opfsWorker and _runtime. Consider wrapping in try/catch to clean up on failure.
    const sqliteMode =
      this._params.config?.get('runtime.client.storage.sqliteMode') ??
      Runtime.Client.Storage.SqliteMode.UNSPECIFIED_SQLITE_MODE;
    log('initiatlizing sqlite', {
      sqliteMode,
      createOpfsWorker: !!this._createOpfsWorker,
      sqlitePath: this._sqlitePath,
    });
    let sqliteLayer;
    switch (sqliteMode) {
      case Runtime.Client.Storage.SqliteMode.OPFS: {
        if (!this._createOpfsWorker) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=OPFS requires a createOpfsWorker option.',
          );
        }
        this._opfsWorker = this._createOpfsWorker();
        sqliteLayer = SqliteClient.layer({ worker: Effect.succeed(this._opfsWorker) });
        log('using sqlite opfs worker');
        break;
      }
      case Runtime.Client.Storage.SqliteMode.FILE: {
        if (!this._sqlitePath) {
          throw new Error(
            'LocalClientServices: runtime.client.storage.sqlite_mode=FILE requires sqlitePath (or runtime.client.storage.data_root with persistent=true).',
          );
        }
        sqliteLayer = layerFile(this._sqlitePath);
        log('using sqlite file', { sqlitePath: this._sqlitePath });
        break;
      }
      case Runtime.Client.Storage.SqliteMode.MEMORY:
      case Runtime.Client.Storage.SqliteMode.UNSPECIFIED_SQLITE_MODE:
      default: {
        if (sqliteMode === Runtime.Client.Storage.SqliteMode.UNSPECIFIED_SQLITE_MODE) {
          log.warn('runtime.client.storage.sqlite_mode not set, using in-memory SQLite');
        }
        sqliteLayer = layerMemory;
        break;
      }
    }

    this._runtime = ManagedRuntime.make(
      SqlTransaction.layer.pipe(
        Layer.provideMerge(sqlExportLayer),
        Layer.provideMerge(sqliteLayer),
        Layer.provideMerge(Reactivity.layer),
        Layer.orDie,
      ),
    );

    this._host = new ClientServicesHost({
      ...this._params,
      runtime: this._runtime.runtimeEffect,
      callbacks: {
        ...this._params.callbacks,
        onReset: async () => {
          this.closed.emit(undefined);
          await this._params.callbacks?.onReset?.();
        },
      },
    });

    await this._host.open(this._ctx);
    this._isOpen = true;
    setIdentityTags({
      identityService: this._host.services.IdentityService!,
      devicesService: this._host.services.DevicesService!,
      setTag: (k: string, v: string) => {
        this.signalMetadataTags[k] = v;
      },
    });
  }

  @synchronized
  async close(): Promise<void> {
    if (!this._isOpen) {
      return;
    }

    await this._host?.close(this._ctx);

    log('local-client-services: terminated effect runtime', { runtimePresent: !!this._runtime });
    await this._runtime?.dispose();
    this._runtime = undefined;
    // Clean up OPFS worker and runtime.
    this._opfsWorker?.terminate();
    this._opfsWorker = undefined;

    this._isOpen = false;
  }
}
