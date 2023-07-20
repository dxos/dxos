//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';
import { inspect } from 'node:util';

import { Event, MulticastObservable, synchronized, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  Space,
  STATUS_TIMEOUT,
} from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import type { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ModelFactory } from '@dxos/model-factory';
import { trace } from '@dxos/protocols';
import { Invitation, SystemStatus, SystemStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { isNode, MaybePromise } from '@dxos/util';

import type { Monitor } from './diagnostics';
import type { EchoProxy } from './echo';
import type { HaloProxy } from './halo';
import type { MeshProxy } from './mesh';
import type { PropertiesProps } from './proto';
import { DXOS_VERSION } from './version';

// TODO(burdon): Define package-specific errors.

/**
 * This options object configures the DXOS Client
 */
export type ClientOptions = {
  /** client configuration object */
  config?: Config;
  /** custom services provider */
  services?: MaybePromise<ClientServicesProvider>;
  /** custom model factory */
  modelFactory?: ModelFactory;
};

/**
 * The Client class encapsulates the core client-side API of DXOS.
 */
export class Client {
  /**
   * The version of this client API
   */
  public readonly version = DXOS_VERSION;

  private readonly _options: ClientOptions;
  private _config!: Config;
  private _modelFactory!: ModelFactory;
  private _services!: ClientServicesProvider;
  private _monitor!: Monitor;
  private _halo!: HaloProxy;
  private _echo!: EchoProxy;
  private _mesh!: MeshProxy;
  // TODO(wittjosiah): Make `null` status part of enum.
  private readonly _statusUpdate = new Event<SystemStatus | null>();

  private _initialized = false;
  private _statusStream?: Stream<SystemStatusResponse>;
  private _statusTimeout?: NodeJS.Timeout;
  private _status = MulticastObservable.from(this._statusUpdate, null);

  /**
   * Unique id of the Client, local to the current peer.
   */
  private readonly _instanceId = PublicKey.random().toHex();
  constructor(options: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      !window.location.origin.includes('localhost')
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
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      initialized: this.initialized,
      echo: this._echo,
      halo: this._halo,
      mesh: this._mesh,
    };
  }

  /**
   * Current configuration object
   */
  get config(): Config {
    return this._config;
  }

  /**
   * Current client services provider.
   */
  get services(): ClientServicesProvider {
    return this._services;
  }

  // TODO(burdon): Rename isOpen.
  /**
   * Returns true if the client has been initialized. Initialize by calling `.initialize()`
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

  /**
   * HALO credentials.
   */
  get halo(): HaloProxy {
    return this._halo;
  }

  /**
   * MESH networking.
   */
  get mesh(): MeshProxy {
    return this._mesh;
  }

  /**
   * Debug monitor.
   */
  get monitor(): Monitor {
    return this._monitor;
  }

  /**
   * @deprecated
   */
  get dbRouter(): DatabaseRouter {
    return this._echo.dbRouter;
  }

  addSchema(schema: EchoSchema): void {
    return this._echo.addSchema(schema);
  }

  /**
   * ECHO spaces.
   */
  get spaces(): MulticastObservable<Space[]> {
    return this._echo.spaces;
  }

  /**
   * Get an existing space by its key.
   */
  getSpace(spaceKey: PublicKey): Space | undefined {
    return this._echo.getSpace(spaceKey);
  }

  /**
   * Creates a new space.
   */
  createSpace(meta?: PropertiesProps): Promise<Space> {
    return this._echo.createSpace(meta);
  }

  /**
   * Accept an invitation to a space.
   */
  acceptInvitation(invitation: Invitation): AuthenticatingInvitationObservable {
    return this._echo.acceptInvitation(invitation);
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

    const { fromHost, fromIFrame } = await import('./services');
    const { Monitor } = await import('./diagnostics');
    const { EchoProxy, createDefaultModelFactory } = await import('./echo');
    const { HaloProxy } = await import('./halo');
    const { MeshProxy } = await import('./mesh');

    this._config = this._options.config ?? new Config();
    // NOTE: Must currently match the host.
    this._modelFactory = this._options.modelFactory ?? createDefaultModelFactory();
    this._services = await (this._options.services ?? (isNode() ? fromHost(this._config) : fromIFrame(this._config)));
    this._monitor = new Monitor(this._services);
    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory);
    this._mesh = new MeshProxy(this._services);
    this._halo._traceParent = this._instanceId;
    this._echo._traceParent = this._instanceId;
    this._mesh._traceParent = this._instanceId;

    await this._services.open();

    // TODO(burdon): Remove?
    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      const { createDevtoolsRpcServer } = await import('./devtools');
      await createDevtoolsRpcServer(this, this._services);
    }

    invariant(this._services.services.SystemService, 'SystemService is not available.');

    const trigger = new Trigger<Error | undefined>();
    this._statusStream = this._services.services.SystemService.queryStatus();
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
        this._statusUpdate.emit(null);
      },
    );

    const err = await trigger.wait();
    if (err) {
      throw err;
    }

    // TODO(wittjosiah): Promise.all?
    await this._monitor.open();
    await this._halo._open();
    await this._echo.open();
    await this._mesh._open();

    this._initialized = true;
    log.trace('dxos.sdk.client.open', trace.end({ id: this._instanceId }));
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

    await this._halo._close();
    await this._echo.close();
    await this._mesh._close();
    await this._monitor.close();

    this._statusTimeout && clearTimeout(this._statusTimeout);
    this._statusStream!.close();
    await this._services.close();

    this._initialized = false;
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    invariant(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services.SystemService.updateStatus({ status: SystemStatus.ACTIVE });
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  async reset() {
    if (!this._initialized) {
      throw new ApiError('Client not open.');
    }

    invariant(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services?.SystemService.reset();
    await this.destroy();
    // this._halo.identityChanged.emit(); // TODO(burdon): Triggers failure in hook.
    this._initialized = false;
  }

  /**
   * @deprecated
   */
  async createSerializer() {
    const { SpaceSerializer } = await import('./echo/serializer');
    return new SpaceSerializer(this._echo);
  }
}
