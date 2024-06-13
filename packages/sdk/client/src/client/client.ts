//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, synchronized, Trigger } from '@dxos/async';
import {
  DEFAULT_CLIENT_CHANNEL,
  STATUS_TIMEOUT,
  clientServiceBundle,
  type ClientServices,
  type ClientServicesProvider,
  type Echo,
  type Halo,
  PropertiesType,
} from '@dxos/client-protocol';
import { createLevel, DiagnosticsCollector } from '@dxos/client-services';
import { type Stream } from '@dxos/codec-protobuf';
import { Config, SaveConfig } from '@dxos/config';
import { Context } from '@dxos/context';
import { inspectObject, raise } from '@dxos/debug';
import { EchoClient } from '@dxos/echo-db';
import { getEchoObjectTypename, type S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ApiError, trace as Trace } from '@dxos/protocols';
import { type QueryStatusResponse, SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { trace } from '@dxos/tracing';
import { type JsonKeyOptions, type MaybePromise } from '@dxos/util';

import { ClientRuntime } from './client-runtime';
import { type MeshProxy } from '../mesh/mesh-proxy';
import type { IFrameManager, Shell, ShellManager } from '../services';
import { DXOS_VERSION } from '../version';

// TODO(burdon): Reconcile with ClientContextProps.
/**
 * This options object configures the DXOS Client.
 */
export type ClientOptions = {
  /** Client configuration object. */
  config?: Config;
  /** Custom services provider. */
  services?: MaybePromise<ClientServicesProvider>;
  /** Custom model factory. @deprecated */
  modelFactory?: any;
  /** Shell path. */
  shell?: string;
  /** Create client worker. */
  createWorker?: () => SharedWorker;
};

/**
 * The Client class encapsulates the core client-side API of DXOS.
 */
@trace.resource()
export class Client {
  /**
   * The version of this client API.
   */
  @trace.info()
  readonly version = DXOS_VERSION;

  /**
   * Emitted after the client is reset and the services have finished restarting.
   */
  readonly reloaded = new Event<void>();

  private readonly _options: ClientOptions;
  private _ctx = new Context();
  private _config?: Config;

  @trace.info()
  private _services?: ClientServicesProvider;

  private _runtime?: ClientRuntime;
  // TODO(wittjosiah): Make `null` status part of enum.
  private readonly _statusUpdate = new Event<SystemStatus | null>();

  @trace.info()
  private _initialized = false;

  @trace.info()
  private _resetting = false;

  private _statusStream?: Stream<QueryStatusResponse>;
  private _statusTimeout?: NodeJS.Timeout;
  private _status = MulticastObservable.from(this._statusUpdate, null);
  private _iframeManager?: IFrameManager;
  private _shellManager?: ShellManager;
  private _shellClientProxy?: ProtoRpcPeer<ClientServices>;

  private readonly _echoClient = new EchoClient({});

  /**
   * Unique id of the Client, local to the current peer.
   */
  @trace.info()
  private readonly _instanceId = PublicKey.random().toHex();

  constructor(options: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.protocol !== 'socket:' &&
      !window.location.hostname.endsWith('localhost')
    ) {
      log.warn(
        `DXOS Client will not function in a non-secure context ${window.location.origin}. Either serve with a certificate or use a tunneling service (https://docs.dxos.org/guide/kube/tunneling.html).`,
      );
    }

    this._options = options;

    // TODO(wittjosiah): Reconcile this with @dxos/log loading config from localStorage.
    const filter = options.config?.get('runtime.client.log.filter');
    if (filter) {
      const prefix = options.config?.get('runtime.client.log.prefix');
      log.config({ filter, prefix });
    }

    this._echoClient.graph.schemaRegistry.addSchema([PropertiesType]);
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  @trace.info({ depth: null })
  toJSON() {
    return {
      initialized: this.initialized,
      spaces: this._runtime?.spaces,
      halo: this._runtime?.halo,
      mesh: this._runtime?.mesh,
    };
  }

  /**
   * Current configuration object.
   */
  get config(): Config {
    invariant(this._config, 'Client not initialized.');
    return this._config;
  }

  /**
   * Current client services provider.
   */
  get services(): ClientServicesProvider {
    invariant(this._services, 'Client not initialized.');
    return this._services;
  }

  // TODO(burdon): Rename isOpen.
  /**
   * Returns true if the client has been initialized. Initialize by calling `.initialize()`.
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * Client services system status.
   */
  get status(): MulticastObservable<SystemStatus | null> {
    return this._status;
  }

  // TODO(burdon): Comment
  get spaces(): Echo {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.spaces;
  }

  /**
   * HALO credentials.
   */
  get halo(): Halo {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.halo;
  }

  /**
   * MESH networking.
   */
  get mesh(): MeshProxy {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.mesh;
  }

  /**
   *
   */
  get shell(): Shell {
    invariant(this._runtime, 'Client not initialized.');
    invariant(this._runtime.shell, 'Shell not available.');
    return this._runtime.shell;
  }

  /**
   * @deprecated Temporary.
   */
  get graph() {
    return this._echoClient.graph;
  }

  /**
   * Add schema types to the client.
   */
  // TODO(burdon): Check if already registered (and remove downstream checks).
  addTypes(types: S.Schema<any>[]) {
    log('addTypes', { schema: types.map((type) => getEchoObjectTypename(type)) });

    // TODO(dmaretskyi): Uncomment after release.
    // if (!this._initialized) {
    //   throw new ApiError('Client not open.');
    // }

    // TODO(burdon): Find?
    const exists = types.filter((type) => !this._echoClient.graph.schemaRegistry.hasSchema(type));
    if (exists.length > 0) {
      this._echoClient.graph.schemaRegistry.addSchema(exists);
    }

    return this;
  }

  /**
   * Get client diagnostics data.
   */
  // TODO(burdon): Return type?
  async diagnostics(options: JsonKeyOptions = {}): Promise<any> {
    invariant(this._services?.services.SystemService, 'SystemService is not available.');
    return DiagnosticsCollector.collect(this._config, this.services, options);
  }

  /**
   * Test and repair database.
   */
  async repair(): Promise<any> {
    // TODO(burdon): Factor out.
    const repairSummary: any = {};

    {
      // Cleanup OPFS.
      const spaces = this.spaces.get();
      const docs = spaces
        .map((space) =>
          (space as any)._data.pipeline.currentEpoch?.subject.assertion.automergeRoot.slice('automerge:'.length),
        )
        .filter(Boolean);

      repairSummary.OPFSRemovedFiles = 0;
      if (typeof navigator !== 'undefined' && navigator.storage) {
        const dir = await navigator.storage.getDirectory();
        for await (const filename of (dir as any)?.keys()) {
          if (filename.includes('automerge_') && !docs.some((doc) => filename.includes(doc))) {
            await dir.removeEntry(filename);
            repairSummary.OPFSRemovedFiles++;
          }
        }
      }
    }

    {
      // Fix storage config.
      const config = {
        runtime: {
          client: {
            storage: {
              dataStore: this.config.values.runtime?.client?.storage?.dataStore,
            },
          },
        },
      };
      await SaveConfig(config);

      repairSummary.storageConfig = config;
    }

    {
      repairSummary.levelDBRemovedEntries = 0;
      // Cleanup old index-data from level db.
      const level = await createLevel(this._config?.values.runtime?.client?.storage ?? {});
      const sublevelsToCleanup = [
        level.sublevel('index-store'),
        level.sublevel('index-metadata').sublevel('clean'),
        level.sublevel('index-metadata').sublevel('dirty'),
      ];

      for (const sublevel of sublevelsToCleanup) {
        repairSummary.levelDBRemovedEntries += (await sublevel.keys().all()).length;
        await sublevel.clear();
      }
    }

    {
      await this._services?.services.QueryService?.reindex(undefined, { timeout: 30_000 });
    }

    log.info('Repair succeeded', { repairSummary });
    return repairSummary;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  async initialize() {
    if (this._initialized) {
      return;
    }

    log.trace('dxos.sdk.client.open', Trace.begin({ id: this._instanceId }));

    const { createClientServices, IFrameManager, ShellManager } = await import('../services');

    this._ctx = new Context();
    this._config = this._options.config ?? new Config();
    // NOTE: Must currently match the host.
    this._services = await (this._options.services ?? createClientServices(this._config, this._options.createWorker));
    this._iframeManager = this._options.shell
      ? new IFrameManager({ source: new URL(this._options.shell, window.location.origin) })
      : undefined;
    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager) : undefined;
    await this._open();
    invariant(this._runtime, 'Client runtime initialization failed.');

    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      const { mountDevtoolsHooks } = await import('../devtools');
      mountDevtoolsHooks({ client: this });
    }

    this._initialized = true;
    log.trace('dxos.sdk.client.open', Trace.end({ id: this._instanceId }));
  }

  private async _open() {
    log('opening...');
    invariant(this._services);
    const { SpaceList } = await import('../echo/space-list');
    const { HaloProxy } = await import('../halo/halo-proxy');
    const { MeshProxy } = await import('../mesh/mesh-proxy');
    const { IFrameClientServicesHost, IFrameClientServicesProxy, Shell } = await import('../services');

    const trigger = new Trigger<Error | undefined>();
    this._services.closed?.on(async (error) => {
      log('terminated', { resetting: this._resetting });
      if (error instanceof ApiError) {
        log.error('fatal', { error });
        trigger.wake(error);
      }
      if (!this._resetting) {
        await this._close();
        await this._open();
        this.reloaded.emit();
      }
    });
    await this._services.open();

    this._echoClient.connectToService({
      dataService: this._services.services.DataService ?? raise(new Error('DataService not available')),
      queryService: this._services.services.QueryService ?? raise(new Error('QueryService not available')),
    });
    await this._echoClient.open(this._ctx);

    const mesh = new MeshProxy(this._services, this._instanceId);
    const halo = new HaloProxy(this._services, this._instanceId);
    const spaces = new SpaceList(
      this._services,
      this._echoClient,
      () => halo.identity.get()?.identityKey,
      this._instanceId,
    );

    const shellManager =
      this._services instanceof IFrameClientServicesProxy || this._services instanceof IFrameClientServicesHost
        ? this._services._shellManager
        : this._shellManager;
    const shell = shellManager
      ? new Shell({
          shellManager,
          identity: halo.identity,
          devices: halo.devices,
          spaces,
        })
      : undefined;
    this._runtime = new ClientRuntime({ spaces, halo, mesh, shell });

    invariant(this._services.services.SystemService, 'SystemService is not available.');
    this._statusStream = this._services.services.SystemService.queryStatus({ interval: 3_000 });
    this._statusStream.subscribe(
      async ({ status }) => {
        this._statusTimeout && clearTimeout(this._statusTimeout);
        trigger.wake(undefined);

        this._statusUpdate.emit(status);
        this._statusTimeout = setTimeout(() => {
          this._statusUpdate.emit(null);
        }, STATUS_TIMEOUT);
      },
      (err) => {
        trigger.wake(err);
        if (err) {
          this._statusUpdate.emit(null);
        }
      },
    );

    const err = await trigger.wait();
    if (err) {
      throw err;
    }

    await this._runtime.open();

    // TODO(wittjosiah): Factor out iframe manager and proxy into shell manager.
    await this._iframeManager?.open();
    await this._shellManager?.open();
    if (this._iframeManager?.iframe) {
      // TODO(wittjosiah): Remove. Workaround for socket runtime bug.
      //   https://github.com/socketsupply/socket/issues/893
      const origin =
        this._iframeManager.source.origin === 'null'
          ? this._iframeManager.source.toString().split('/').slice(0, 3).join('/')
          : this._iframeManager.source.origin;

      this._shellClientProxy = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: this._services.services as ClientServices,
        port: createIFramePort({
          channel: DEFAULT_CLIENT_CHANNEL,
          iframe: this._iframeManager.iframe,
          origin,
        }),
        handlerRpcOptions: {
          timeout: 60_000, // Timeout is specifically very high because shell will be managing its own timeouts on RPCs.
        },
      });

      await this._shellClientProxy.open();
    }

    log('opened');
  }

  /**
   * Cleanup, release resources.
   * Open/close is re-entrant.
   */
  @synchronized
  async destroy() {
    if (!this._initialized) {
      return;
    }

    // TODO(burdon): Call flush?
    await this._close();
    this._statusUpdate.emit(null);
    await this._ctx.dispose();

    this._initialized = false;
  }

  private async _close() {
    log('closing...');
    this._statusTimeout && clearTimeout(this._statusTimeout);
    await this._statusStream?.close();
    await this._runtime?.close();
    await this._echoClient.close(this._ctx);
    await this._services?.close();
    log('closed');
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    invariant(this.services.services.SystemService, 'SystemService is not available.');
    await this.services.services.SystemService.updateStatus({ status: SystemStatus.ACTIVE });
  }

  /**
   * Resets and destroys client storage.
   */
  @synchronized
  async reset() {
    if (!this._initialized) {
      throw new ApiError('Client not open.');
    }

    log('resetting...');
    this._resetting = true;
    invariant(this._services?.services.SystemService, 'SystemService is not available.');
    await this._services?.services.SystemService.reset();
    await this._close();
    await this._open();
    this._resetting = false;
    this.reloaded.emit();
    log('reset complete');
  }
}
