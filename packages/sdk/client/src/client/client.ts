//
// Copyright 2022 DXOS.org
//

import { inspect } from 'node:util';

import { Event, MulticastObservable, synchronized, Trigger } from '@dxos/async';
import {
  types as clientSchema,
  type ClientServicesProvider,
  STATUS_TIMEOUT,
  type ClientServices,
  clientServiceBundle,
  DEFAULT_CLIENT_CHANNEL,
} from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { inspectObject } from '@dxos/debug';
import { Hypergraph, schemaBuiltin } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ModelFactory } from '@dxos/model-factory';
import { ApiError, trace } from '@dxos/protocols';
import {
  GetDiagnosticsRequest,
  type QueryStatusResponse,
  SystemStatus,
} from '@dxos/protocols/proto/dxos/client/services';
import { createProtoRpcPeer, type ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { type JsonKeyOptions, jsonKeyReplacer, type MaybePromise } from '@dxos/util';

import { ClientRuntime } from './client-runtime';
import type { SpaceList, TypeCollection } from '../echo';
import type { HaloProxy } from '../halo';
import type { MeshProxy } from '../mesh';
import type { IFrameManager, Shell, ShellManager } from '../services';
import { DXOS_VERSION } from '../version';

/**
 * This options object configures the DXOS Client.
 */
// TODO(burdon): Reconcile with ClientContextProps.
export type ClientOptions = {
  /** Client configuration object. */
  config?: Config;
  /** Custom services provider. */
  services?: MaybePromise<ClientServicesProvider>;
  /** Custom model factory. */
  modelFactory?: ModelFactory;
  /** Types. */
  types?: TypeCollection;
  /** Shell path. */
  shell?: string;
};

/**
 * The Client class encapsulates the core client-side API of DXOS.
 */
export class Client {
  /**
   * The version of this client API.
   */
  public readonly version = DXOS_VERSION;

  private readonly _options: ClientOptions;
  private _ctx = new Context();
  private _config?: Config;
  private _services?: ClientServicesProvider;
  private _runtime?: ClientRuntime;
  // TODO(wittjosiah): Make `null` status part of enum.
  private readonly _statusUpdate = new Event<SystemStatus | null>();

  private _initialized = false;
  private _resetting = false;
  private _statusStream?: Stream<QueryStatusResponse>;
  private _statusTimeout?: NodeJS.Timeout;
  private _status = MulticastObservable.from(this._statusUpdate, null);
  private _iframeManager?: IFrameManager;
  private _shellManager?: ShellManager;
  private _shellClientProxy?: ProtoRpcPeer<ClientServices>;

  private readonly _graph = new Hypergraph();

  /**
   * Unique id of the Client, local to the current peer.
   */
  private readonly _instanceId = PublicKey.random().toHex();

  constructor(options: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      !window.location.hostname.endsWith('localhost')
    ) {
      console.warn(
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

    this.addTypes(schemaBuiltin);
    this.addTypes(clientSchema);
    if (this._options.types) {
      this.addTypes(this._options.types);
    }
  }

  [inspect.custom]() {
    return inspectObject(this);
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

  get spaces(): SpaceList {
    invariant(this._runtime, 'Client not initialized.');
    return this._runtime.spaces;
  }

  /**
   * HALO credentials.
   */
  get halo(): HaloProxy {
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
  get experimental() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    return {
      get graph() {
        return self._graph;
      },
    };
  }

  // TODO(dmaretskyi): Expose `graph` directly?
  // TODO(burdon): Make idempotent.
  addTypes(types: TypeCollection) {
    this._graph.addTypes(types);
    return this;
  }

  /**
   * @deprecated Replaced by addTypes.
   */
  addSchema(types: TypeCollection) {
    return this.addTypes(types);
  }

  /**
   * Get client diagnostics data.
   */
  async diagnostics(options: JsonKeyOptions = {}): Promise<any> {
    invariant(this._services?.services.SystemService, 'SystemService is not available.');
    const data = await this._services.services.SystemService.getDiagnostics({
      keys: options.humanize
        ? GetDiagnosticsRequest.KEY_OPTION.HUMANIZE
        : options.truncate
        ? GetDiagnosticsRequest.KEY_OPTION.TRUNCATE
        : undefined,
    });
    return JSON.parse(JSON.stringify(data, jsonKeyReplacer(options)));
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

    log.trace('dxos.sdk.client.open', trace.begin({ id: this._instanceId }));

    const { createClientServices, IFrameManager, ShellManager } = await import('../services');

    this._ctx = new Context();
    this._config = this._options.config ?? new Config();
    // NOTE: Must currently match the host.
    this._services = await (this._options.services ?? createClientServices(this._config));
    this._iframeManager = this._options.shell
      ? new IFrameManager({ source: new URL(this._options.shell, window.location.origin) })
      : undefined;
    this._shellManager = this._iframeManager ? new ShellManager(this._iframeManager) : undefined;
    await this._open();

    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      const { mountDevtoolsHooks } = await import('../devtools');
      mountDevtoolsHooks({ client: this });
    }

    this._initialized = true;
    log.trace('dxos.sdk.client.open', trace.end({ id: this._instanceId }));
  }

  private async _open() {
    log('opening...');
    invariant(this._services);
    const { SpaceList, createDefaultModelFactory } = await import('../echo');
    const { HaloProxy } = await import('../halo');
    const { MeshProxy } = await import('../mesh');
    const { IFrameClientServicesHost, IFrameClientServicesProxy, Shell } = await import('../services');

    await this._services.open(this._ctx);
    this._services.terminated?.on(async () => {
      log('terminated', { resetting: this._resetting });
      if (!this._resetting) {
        await this._close();
        await this._open();
      }
    });

    const modelFactory = this._options.modelFactory ?? createDefaultModelFactory();
    const mesh = new MeshProxy(this._services, this._instanceId);
    const halo = new HaloProxy(this._services, this._instanceId);
    const spaces = new SpaceList(
      this._services,
      modelFactory,
      this._graph,
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

    const trigger = new Trigger<Error | undefined>();
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
      this._shellClientProxy = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: this._services.services as ClientServices,
        port: createIFramePort({
          channel: DEFAULT_CLIENT_CHANNEL,
          iframe: this._iframeManager.iframe,
          origin: this._iframeManager.source.origin,
        }),
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
    await this._services?.close(this._ctx);
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
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
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
    log('reset complete');
  }
}
