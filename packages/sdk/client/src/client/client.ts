//
// Copyright 2022 DXOS.org
//

import * as EffectContext from 'effect/Context';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { inspect } from 'node:util';

import {
  Event,
  MulticastObservable,
  Trigger,
  asyncTimeout,
  scheduleTask,
  scheduleTaskInterval,
  synchronized,
} from '@dxos/async';
import { createEdgeBlobBackend } from '@dxos/blob/hosted';
import {
  type ClientServicesProvider,
  type Echo,
  type Halo,
  type Rpc,
  SpaceProperties,
  STATUS_TIMEOUT,
  makeHandlersFromRpc,
  serveClientServicesOverIFrame,
} from '@dxos/client-protocol';
import { Config, SaveConfig, resolveTelemetryTag } from '@dxos/config';
import { Context, ContextDisposedError } from '@dxos/context';
import { Blob, type Hypergraph, Type } from '@dxos/echo';
import { EchoClient } from '@dxos/echo-client';
import { type EdgeHttpClient } from '@dxos/edge-client/http';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  ApiError,
  AuthorizationError,
  InvalidConfigError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  RpcClosedError,
  runServiceCall,
  subscribeStream,
} from '@dxos/protocols';
import { SystemStatus } from '@dxos/protocols/buf/dxos/client/services_pb';
import { DataService } from '@dxos/protocols/rpc';
import { trace } from '@dxos/tracing';
import { type JsonKeyOptions, type MaybePromise, markMilestone } from '@dxos/util';

import { type ClientEdgeAPI, createClientEdgeAPI, createEdgeIdentity } from '../edge/index.ts';
import { type MeshProxy } from '../mesh/mesh-proxy.ts';
import type { BootCacheOptions, BootCacheServices } from '../services/boot-cache/index.ts';
import type { IFrameManager, Shell, ShellManager } from '../services/index.ts';
import { DXOS_VERSION } from '../version.ts';
import { ClientRuntime } from './client-runtime.ts';
import { createRpcBlobStore } from './rpc-blob-store.ts';

/** Longest a destroy waits for a database's pending writes to reach the host. */
const DESTROY_FLUSH_TIMEOUT = 5_000;

/**
 * This options object configures the DXOS Client.
 */
// TODO(burdon): Reconcile with ClientProviderProps.
export type ClientOptions = {
  /** Client configuration object. */
  config?: Config;

  /** Custom services provider. */
  services?: MaybePromise<ClientServicesProvider>;

  /** Effect runtime used by client components to run service-rpc effects. Defaults to the default runtime. */
  runtime?: EffectContext.Context<never>;

  /** ECHO schema. */
  types?: Type.AnyEntity[];

  /** Shell path. */
  shell?: string;

  /** Path to SQLite database file for persistent indexing in Node/Bun. Dervied from config's dataRoot. */
  sqlitePath?: string;

  /** When running in the host mode, a factory to create the worker for OPFS sqlite database. */
  createOpfsWorker?: () => Worker;

  /**
   * Opens from what the last session persisted to IndexedDB - the startup streams and each space's working
   * set - instead of waiting for the services, which bring it current once reachable. Off when unset.
   */
  bootCache?: BootCacheOptions;
};

/** The first boot-cache write waits this long after initialization, so it holds what the app settled on. */
const BOOT_CACHE_FIRST_WRITE_MS = 5_000;
const BOOT_CACHE_WRITE_INTERVAL_MS = 60_000;

/**
 * The Client class encapsulates the core client-side API of DXOS.
 */
export class Client {
  /**
   * Emitted after the client is reset and the services have finished restarting.
   */
  readonly reloaded = new Event<void>();

  // TODO(wittjosiah): Make `null` status part of enum.
  private readonly _statusUpdate = new Event<SystemStatus | null>();
  private readonly _status = MulticastObservable.from(this._statusUpdate, null);
  private readonly _indexStatusUpdate = new Event<DataService.IndexStatus | null>();
  private readonly _indexStatus = MulticastObservable.from(this._indexStatusUpdate, null);
  private readonly _indexActivityUpdate = new Event<DataService.IndexActivity>();
  private readonly _indexActivity = MulticastObservable.from(this._indexActivityUpdate, {});
  private readonly _fatalErrorUpdate = new Event<Error | null>();
  private readonly _fatalError = MulticastObservable.from(this._fatalErrorUpdate, null);

  private readonly _echoClient = new EchoClient();

  private readonly _options: ClientOptions;

  /** Effect runtime threaded to client components for running service-rpc effects. */
  private readonly _effectRuntime: EffectContext.Context<never>;

  /**
   * Unique id of the Client, local to the current peer.
   */
  private readonly _instanceId = PublicKey.random().toHex();

  /**
   * The version of this client API.
   */
  readonly version = DXOS_VERSION;

  private _services?: ClientServicesProvider;
  private _bootCache?: BootCacheServices;

  private _initialized = false;

  /** Resolves when `initialize()` completes, so consumers can suspend on a forked init. */
  private readonly _initializedTrigger = new Trigger();

  private _servicesReady = false;

  /** Resolves when the services answer, which a boot-cached client reaches after `initialize()` completes. */
  private readonly _servicesReadyTrigger = new Trigger();

  private _resetting = false;

  private _runtime?: ClientRuntime;

  private _ctx = new Context();
  private _config?: Config;
  private _statusStreamCleanup?: () => void;
  private _statusTimeout?: NodeJS.Timeout;
  private _iframeManager?: IFrameManager;
  private _shellManager?: ShellManager;
  private _shellClientServer?: Rpc.GroupServer;
  private _edgeHttpClient?: EdgeHttpClient = undefined;
  private _edgeApi?: ClientEdgeAPI = undefined;
  private _edgeIdentitySubscription?: { unsubscribe: () => void };
  private _blobBackendCleanup?: () => void;

  constructor(options: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      typeof window.location !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.protocol !== 'chrome-extension:' &&
      window.location.protocol !== 'socket:' &&
      !window.location.hostname.endsWith('localhost')
    ) {
      log.warn(
        `DXOS Client will not function in a non-secure context ${window.location.origin}. Either serve with a certificate or use a tunneling service (https://docs.dxos.org/guide/kube/tunneling.html).`,
      );
    }

    this._options = options;
    this._effectRuntime = options.runtime ?? EffectContext.empty();

    // TODO(wittjosiah): Reconcile this with @dxos/log loading config from localStorage.
    const filter = options.config?.get('runtime.client.log.filter');
    if (filter) {
      const prefix = options.config?.get('runtime.client.log.prefix');
      log.config({ filter, prefix });
    }

    // TODO(wittjosiah): This is ill-advised.
    //   However, it seems to work okay for now since the runtime registry operates synchronously despite the interface.
    //   Moving this to `initialize` causes issues with re-initialization.
    this._echoClient.graph.registry.add([SpaceProperties]);
    if (this._options.types) {
      void this.addTypes(this._options.types);
    }
    this._echoClient.indexStatusUpdated.on((status) => this._indexStatusUpdate.emit(status));
    this._echoClient.indexActivityUpdated.on((activity) => this._indexActivityUpdate.emit(activity));
  }

  [inspect.custom](): string {
    return this.toString();
  }

  toString(): string {
    return `Client(${this._instanceId})`;
  }

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
  // TODO(burdon): Return services.services. Move to debug endpoint.
  get services(): ClientServicesProvider {
    invariant(this._services, 'Client not initialized.');
    return this._services;
  }

  /**
   * Whether the client is ready: `initialize()` has completed and the client can be used.
   * With {@link ClientOptions.bootCache} that can be from the cache, before the services answer;
   * see {@link servicesReady}.
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * Whether the client services are open and answering. Implies {@link initialized}.
   */
  get servicesReady() {
    return this._servicesReady;
  }

  /**
   * Resolves once the client is ready (milestone `client.ready`): `initialize()` has completed, and
   * identity, spaces and queries can be used. With {@link ClientOptions.bootCache} that can be from
   * the cache, before the services answer. An app waits on this to render.
   *
   * Waits indefinitely unless `timeout` is given, in which case it rejects with `TimeoutError` -
   * opt-in because most consumers only want the completion signal, and bounding the session is the
   * caller's job (see the app entry point).
   *
   * This is the completion signal, not the error channel: a failing `initialize()` rejects at its
   * own call site, and this promise stays pending.
   */
  waitUntilInitialized({ timeout }: { timeout?: number } = {}): Promise<void> {
    return this._initializedTrigger.wait({ timeout });
  }

  /**
   * Resolves once the client services are open and answering (milestone `client.services-ready`),
   * never before {@link waitUntilInitialized}. Without {@link ClientOptions.bootCache} both resolve
   * together; with it, this can come well after. Wait on this only for what the cache cannot stand in
   * for: observability, releasing a resource the services take over, or acting on a result only the
   * services can report.
   *
   * Rejects when services the client opened from the cache fail to open, since `initialize()` has
   * already returned and cannot report it, and with `ContextDisposedError` when the client is destroyed
   * first; `timeout` behaves as in {@link waitUntilInitialized}.
   */
  waitUntilServicesReady({ timeout }: { timeout?: number } = {}): Promise<void> {
    return this._servicesReadyTrigger.wait({ timeout });
  }

  /**
   * What the ECHO index is doing (migrating, rebuilding, idle), for a boot screen or progress
   * indicator. Reported by the worker while the client opens, then streamed from the host;
   * `null` until the host first reports.
   */
  get indexStatus(): MulticastObservable<DataService.IndexStatus | null> {
    return this._indexStatus;
  }

  /** Index work queries answer through, such as catch-up and the full-text index, for a progress indicator. */
  get indexActivity(): MulticastObservable<DataService.IndexActivity> {
    return this._indexActivity;
  }

  /**
   * Client services system status.
   */
  get status(): MulticastObservable<SystemStatus | null> {
    return this._status;
  }

  /**
   * Set when the system status stream fails after open; cleared only when the client reopens.
   */
  get fatalError(): MulticastObservable<Error | null> {
    return this._fatalError;
  }

  /**
   * True while an in-progress {@link reset} is tearing down services. Consumers that react to
   * service disconnect/reconnect (e.g. to force a reload) should check this before choosing a
   * reload target - mid-reset, the current route is stale and reloading to it would reopen
   * now-cleared UI, so navigate to the origin instead.
   */
  get resetting(): boolean {
    return this._resetting;
  }

  /**
   * ECHO Spaces.
   */
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
   * EDGE client.
   * This API is experimental and subject to change.
   */
  get edge(): ClientEdgeAPI {
    invariant(this._edgeApi, 'Client not initialized or Edge not available.');
    return this._edgeApi;
  }

  /**
   * ECHO graph.
   */
  get graph(): Hypergraph.Hypergraph {
    return this._echoClient.graph;
  }

  /**
   * Shell API.
   */
  get shell(): Shell {
    invariant(this._runtime, 'Client not initialized.');
    invariant(this._runtime.shell, 'Shell not available.');
    return this._runtime.shell;
  }

  /**
   * Add schema types to the client.
   */
  // TODO(burdon): Check if already registered (and remove downstream checks).
  async addTypes(types: Type.AnyEntity[]) {
    log('addTypes', { schema: types.map((type) => Type.getTypename(type)) });

    // TODO(dmaretskyi): Uncomment after release.
    // if (!this._initialized) {
    //   throw new ApiError('Client not open.');
    // }

    this._echoClient.graph.registry.add(types);
  }

  /**
   * Get client diagnostics data.
   */
  // TODO(burdon): Return type?
  async diagnostics(options: JsonKeyOptions = {}): Promise<any> {
    const { Diagnostics } = await import('@dxos/client-services');
    invariant(this._services?.services.SystemService, 'SystemService is not available.');
    return Diagnostics.DiagnosticsCollector.collect(this._config, this.services, options);
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
      invariant(this._services, 'Client not initialized.');
      await runServiceCall(this._effectRuntime, this._services.rpc, 'QueryService.reindex', undefined, {
        timeout: 30_000,
      });
    }

    log.info('Repair succeeded', { repairSummary });
    return repairSummary;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  async initialize(): Promise<Client> {
    if (this._initialized) {
      return this;
    }

    performance.mark('client.initialize:called');
    markMilestone('client.initializing');
    log('initializing client');
    const { createClientServices, IFrameManager, ShellManager } = await import('../services/index.ts');
    const { Runtime_Client_ServicesMode, Runtime_Client_Storage_SqliteMode } =
      await import('@dxos/protocols/buf/dxos/config_pb');
    performance.mark('client.initialize:imports-loaded');
    log('client.initialize: imports loaded');

    this._ctx = new Context();
    this._config = this._options.config ?? new Config();

    if (!this._options.services) {
      // Default services mode when not explicitly set in config. The Client entrypoint only runs
      // services in-thread (HOST); the dedicated worker is a composer-app-level choice.
      const clientCfg = this._config.values.runtime?.client;
      if (!clientCfg?.servicesMode && !clientCfg?.remoteSource) {
        const servicesMode = Runtime_Client_ServicesMode.HOST;
        // Default SQLite backing when the caller didn't set one:
        // - OPFS when a createOpfsWorker callback was supplied (browser with persistent indexing)
        // - FILE when a sqlitePath or dataRoot is supplied (Node/Bun CLI or persistent config)
        // - MEMORY otherwise
        const sqliteMode = clientCfg?.storage?.sqliteMode
          ? undefined
          : this._options.createOpfsWorker
            ? Runtime_Client_Storage_SqliteMode.OPFS
            : this._options.sqlitePath || clientCfg?.storage?.dataRoot
              ? Runtime_Client_Storage_SqliteMode.FILE
              : Runtime_Client_Storage_SqliteMode.MEMORY;
        this._config = new Config(
          { runtime: { client: { servicesMode, ...(sqliteMode !== undefined && { storage: { sqliteMode } }) } } },
          this._config.values,
        );
      }
    }

    // NOTE: Must currently match the host.
    log('client.initialize: creating services provider', {
      providedServices: !!this._options.services,
      hasCreateOpfsWorker: !!this._options.createOpfsWorker,
      sqlitePath: this._options.sqlitePath,
    });
    const provider = await (this._options.services ??
      createClientServices(this._config, {
        createOpfsWorker: this._options.createOpfsWorker,
        sqlitePath: this._options.sqlitePath, // TODO(dmaretskyi): Remove and derive from dataRoot in config.
      }));
    if (this._options.bootCache) {
      // Loaded only when asked for, so a client without it carries none of it at boot.
      const { BootCacheServices, BootCacheStore } = await import('../services/boot-cache/index.ts');
      if (BootCacheStore.isAvailable()) {
        this._bootCache = new BootCacheServices(provider, this._options.bootCache);
      }
    }
    this._services = this._bootCache ?? provider;
    performance.mark('client.initialize:services-created');
    log('client.initialize: services provider created');
    // Once, not per `_open`: the provider outlives a reopen and keeps every callback it is given.
    const services = this._services;
    services.onReconnect?.(async () => {
      const rpc = services.rpc;
      this._echoClient._updateServices({ dataService: rpc, queryService: rpc, feedService: rpc });
      await this._echoClient._notifyReconnect();
    });
    services.hostStatus?.on((status) => {
      const decoded = Schema.decodeUnknownOption(DataService.IndexStatus)(status);
      if (Option.isSome(decoded)) {
        this._indexStatusUpdate.emit(decoded.value);
      }
    });
    this._iframeManager = this._options.shell
      ? new IFrameManager({ source: new URL(this._options.shell, window.location.origin) })
      : undefined;
    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager) : undefined;
    log('client.initialize: opening client');
    await this._open(this._ctx);
    performance.mark('client.initialize:opened');
    log('client.initialize: client opened');
    invariant(this._runtime, 'Client runtime initialization failed.');

    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      log('client.initialize: mounting devtools hooks');
      const { mountDevtoolsHooks } = await import('../devtools/index.ts');
      mountDevtoolsHooks({ client: this });
      log('client.initialize: devtools hooks mounted');
    }

    this._initialized = true;
    this._initializedTrigger.wake();
    if (this._bootCache) {
      this._persistBootCache(this._bootCache);
    }
    performance.mark('client.initialize:completed');
    markMilestone('client.ready');
    performance.measure('client.initialize', 'client.initialize:called', 'client.initialize:completed');
    log('initialized client');
    this._signalServicesReady(this._ctx, this._bootCache);
    return this;
  }

  /** Wakes {@link waitUntilServicesReady} once the services answer, unless the client was destroyed first. */
  private _signalServicesReady(ctx: Context, bootCache: BootCacheServices | undefined): void {
    const ready = () => {
      if (ctx.disposed) {
        return;
      }
      this._servicesReady = true;
      this._servicesReadyTrigger.wake();
      markMilestone('client.services-ready');
    };
    if (!bootCache) {
      ready();
      return;
    }
    bootCache.whenServicesOpen().then(ready, (error) => {
      if (!ctx.disposed) {
        this._servicesReadyTrigger.throw(
          error instanceof Error ? error : new Error('client services failed to open', { cause: error }),
        );
      }
    });
  }

  /** Writes the boot cache once the app has settled, then periodically and whenever the page is hidden. */
  private _persistBootCache(bootCache: BootCacheServices): void {
    const persist = async () => {
      const spaces = this._runtime?.spaces;
      if (spaces) {
        await bootCache.persist(spaces._workingSetSources());
      }
    };
    const ctx = this._ctx;
    scheduleTask(ctx, persist, BOOT_CACHE_FIRST_WRITE_MS);
    scheduleTaskInterval(ctx, persist, BOOT_CACHE_WRITE_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      const onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          void persist();
        }
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      ctx.onDispose(() => document.removeEventListener('visibilitychange', onVisibilityChange));
    }
  }

  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  private async _open(ctx: Context): Promise<void> {
    log('opening...');
    invariant(this._services);
    const trigger = new Trigger<Error | undefined>();
    this._services.closed?.on(async (error) => {
      log('terminated', { resetting: this._resetting });
      if (
        error instanceof ApiError ||
        error instanceof InvalidConfigError ||
        error instanceof AuthorizationError ||
        error instanceof RemoteServiceConnectionError ||
        error instanceof RemoteServiceConnectionTimeout
      ) {
        log.error('fatal', { error });
        trigger.wake(error);
      }
      if (!this._resetting) {
        await this._close();
        await this._open(this._ctx);
        this.reloaded.emit();
      }
    });
    // The services open alongside the proxy imports rather than after them: the worker handshake is
    // the long pole, and each sequential import waits out a main thread busy with plugin activation.
    log('client._open: importing proxy modules and opening services...');
    invariant(this._config, 'Client not initialized.');
    const edgeUrl = this._config.get('runtime.services.edge.url');
    const [{ SpaceList }, { HaloProxy }, { MeshProxy }, { Shell }, edgeClientModule] = await Promise.all([
      import('../echo/space-list.ts'),
      import('../halo/halo-proxy.ts'),
      import('../mesh/mesh-proxy.ts'),
      import('../services/index.ts'),
      edgeUrl ? import('@dxos/edge-client') : undefined,
      this._services.open(),
    ]);
    log('client._open: services opened');

    if (edgeUrl && edgeClientModule) {
      const { EdgeHttpClient } = edgeClientModule;
      const clientTag = resolveTelemetryTag(this._config);
      this._edgeHttpClient = new EdgeHttpClient(edgeUrl, { clientTag });
      this._edgeApi = createClientEdgeAPI({ client: this, edgeClient: this._edgeHttpClient });
    }

    log('client._open: connecting echo client to service...');
    // The effect-rpc client nests every service under its key, so the same `rpc` surface satisfies
    // each per-service Client (DataService.Client, etc.).
    this._echoClient.connectToService({
      dataService: this._services.rpc,
      queryService: this._services.rpc,
      feedService: this._services.rpc,
      runtime: this._effectRuntime,
    });
    log('client._open: opening echo client...');
    await this._echoClient.open(ctx);
    log('client._open: echo client opened');

    const mesh = new MeshProxy(this._services, this._effectRuntime);
    const halo = new HaloProxy(this._services, this._effectRuntime);
    const bootCache = this._bootCache;
    const spaces = new SpaceList(
      this._config,
      this._services,
      this._echoClient,
      this._effectRuntime,
      bootCache && ((spaceId) => bootCache.takeWorkingSet(spaceId)),
    );

    const shell = this._shellManager
      ? new Shell({
          shellManager: this._shellManager,
          identity: halo.identity,
          devices: halo.devices,
          spaces,
        })
      : undefined;
    this._runtime = new ClientRuntime({ spaces, halo, mesh, shell });

    if (this._edgeHttpClient) {
      const edgeHttpClient = this._edgeHttpClient;
      const updateIdentity = () => {
        if (!halo.identity.get()) {
          return;
        }
        try {
          edgeHttpClient.setIdentity(createEdgeIdentity(this));
        } catch (error) {
          // Identity and device become ready asynchronously and independently - createEdgeIdentity
          // throws 'Identity not available' if device isn't ready yet, retried by the next
          // identity or device update once both are available. Anything else is unexpected and
          // shouldn't fail silently.
          if (!(error instanceof Error) || error.message !== 'Identity not available') {
            log.error('failed to update edge identity', { error });
          }
        }
      };
      updateIdentity();
      const identitySubscription = halo.identity.subscribe(updateIdentity);
      const deviceSubscription = halo.devices.subscribe(updateIdentity);
      this._edgeIdentitySubscription = {
        unsubscribe: () => {
          identitySubscription.unsubscribe();
          deviceSubscription.unsubscribe();
        },
      };
    }

    // Registered with or without an edge endpoint: a write is confirmed once the host stores it
    // locally, and the host replicates to the edge, when configured, on its own.
    const edgeHttpClient = this._edgeHttpClient;
    const services = this._services;
    const blobBackend = createEdgeBlobBackend({
      store: createRpcBlobStore(() => services.rpc, this._effectRuntime),
      finalizeUpload: edgeHttpClient && ((uploadId) => edgeHttpClient.finalizeBlobUpload(Context.default(), uploadId)),
    });
    const unregisterBlobBackend = this._echoClient.graph.registerBlobBackend(Blob.Storage.edge, blobBackend, {
      default: true,
    });
    this._blobBackendCleanup = () => {
      unregisterBlobBackend();
      blobBackend.close();
    };

    log('client._open: subscribing to system status...');
    this._fatalErrorUpdate.emit(null);
    let statusReceived = false;
    this._statusStreamCleanup = subscribeStream(
      this._effectRuntime,
      this._services.rpc['SystemService.queryStatus']({ interval: 3_000 }),
      {
        onData: ({ status }) => {
          log('client._open: status received', { status });
          statusReceived = true;
          this._statusTimeout && clearTimeout(this._statusTimeout);
          trigger.wake(undefined);

          this._statusUpdate.emit(status);
          this._statusTimeout = setTimeout(() => {
            this._statusUpdate.emit(null);
          }, STATUS_TIMEOUT);
        },
        onError: (err) => {
          log('client._open: status error', { err });
          this._statusUpdate.emit(null);
          if (!statusReceived) {
            trigger.wake(err);
            return;
          }

          // A lost connection is reopened by `_services.closed`, and a reset tears services down on purpose.
          if (this._resetting || err instanceof RpcClosedError) {
            return;
          }
          log.error('system status stream failed', { err });
          this._fatalErrorUpdate.emit(err);
        },
        onClose: () => {
          trigger.wake(undefined);
        },
      },
    );

    log('client._open: waiting for status trigger...');
    const err = await trigger.wait();
    if (err) {
      throw err;
    }
    log('client._open: status trigger resolved');

    log('client._open: opening runtime...');
    await this._runtime.open(ctx);
    log('client._open: runtime opened');

    // TODO(wittjosiah): Factor out iframe manager and proxy into shell manager.
    if (this._iframeManager) {
      log('client._open: opening iframe manager');
      await this._iframeManager.open();
      log('client._open: iframe manager opened');
    }
    if (this._shellManager) {
      log('client._open: opening shell manager');
      await this._shellManager.open();
      log('client._open: shell manager opened');
    }
    const iframeManager = this._iframeManager;
    const shellIframe = iframeManager?.iframe;
    if (iframeManager && shellIframe) {
      // TODO(wittjosiah): Remove. Workaround for socket runtime bug.
      //   https://github.com/socketsupply/socket/issues/893
      const origin =
        iframeManager.source.origin === 'null'
          ? iframeManager.source.toString().split('/').slice(0, 3).join('/')
          : iframeManager.source.origin;

      // Re-serve the client services to the shell iframe over effect-rpc, matching the shell's
      // `ClientServicesProxy` consumer. Handlers are derived from the already-open effect-native
      // `rpc` surface so calls forward straight to the underlying provider (worker or host). The
      // server (and its byte `RpcPort` binding) is constructed inside `@dxos/client-protocol`, which
      // resolves the iframe transport types in one consistent universe.
      const shellServicesHandlers = makeHandlersFromRpc(this._services.rpc);
      this._shellClientServer = await serveClientServicesOverIFrame({
        iframe: shellIframe,
        origin,
        services: () => shellServicesHandlers,
      });
    }

    log('opened');
  }

  /**
   * Cleanup, release resources.
   * Open/close is re-entrant.
   */
  @synchronized
  async destroy(): Promise<void> {
    log.verbose('client.destroy: destroying client', { initialized: this._initialized });
    if (!this._initialized) {
      return;
    }

    await this._flushDatabases();
    await this._close();
    this._statusUpdate.emit(null);
    await this._ctx.dispose();

    this._initialized = false;
    // Back to WAITING alongside `_initialized`: leaving the trigger resolved makes
    // `waitUntilInitialized()` resolve for a client that is not initialized, which spins
    // `useClient` - it throws an already-settled promise, React retries, and it suspends again.
    this._initializedTrigger.reset();
    this._servicesReady = false;
    // A waiter on services that never opened would otherwise hang on a promise nothing settles.
    this._servicesReadyTrigger.throw(new ContextDisposedError());
    this._servicesReadyTrigger.reset();
  }

  async [Symbol.asyncDispose]() {
    await this.destroy();
  }

  /**
   * Hands writes still pending to the host, so objects added just before the client is torn down (e.g. by a
   * React StrictMode remount) are not lost. The bound only stops a dead host from holding destroy open.
   */
  private async _flushDatabases(): Promise<void> {
    await Promise.all(
      Array.from(this._echoClient.openDatabases, (db) =>
        asyncTimeout(db.flush({ indexes: false }), DESTROY_FLUSH_TIMEOUT).catch((err) =>
          log.warn('pending writes were not handed to the host before destroy', { spaceId: db.spaceId, err }),
        ),
      ),
    );
  }

  private async _close(): Promise<void> {
    log.verbose('client._close: closing...');
    this._statusTimeout && clearTimeout(this._statusTimeout);
    this._statusStreamCleanup?.();
    this._statusStreamCleanup = undefined;
    await this._runtime?.close(this._ctx);
    await this._echoClient.close(this._ctx);
    await this._shellClientServer?.close();
    this._shellClientServer = undefined;
    this._blobBackendCleanup?.();
    this._blobBackendCleanup = undefined;
    log.verbose('client._close: closing services...');
    await this._services?.close();
    this._edgeIdentitySubscription?.unsubscribe();
    this._edgeIdentitySubscription = undefined;
    this._edgeHttpClient = undefined;
    this._edgeApi = undefined;
    log('closed');
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    await runServiceCall(this._effectRuntime, this.services.rpc, 'SystemService.updateStatus', {
      status: SystemStatus.ACTIVE,
    });
  }

  /**
   * Resets and destroys client storage.
   * This will currently leave the client in a closed state.
   * Re-using the client after reset is not currently supported.
   */
  @synchronized
  async reset(): Promise<void> {
    if (!this._initialized) {
      throw new ApiError({ message: 'Client not open.' });
    }

    log('resetting...');
    this._resetting = true;
    await this._bootCache?.clear().catch((err) => log.warn('boot cache not cleared', { err }));
    invariant(this._services, 'Client not initialized.');
    await runServiceCall(this._effectRuntime, this._services.rpc, 'SystemService.reset', undefined).catch((err) => {
      if (!isHostShutDownByReset(err)) {
        throw err;
      }
    });
    await this._close();

    // TODO(wittjosiah): Re-open after reset.
    // await this._open();
    // this._resetting = false;
    // this.reloaded.emit();
    log('reset complete');
  }
}

const isHostShutDownByReset = (err: unknown): boolean => err instanceof RpcClosedError;
