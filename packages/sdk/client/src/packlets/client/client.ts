//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, MulticastObservable, synchronized, Trigger } from '@dxos/async';
import {
  AuthenticatingInvitationObservable,
  ClientServicesProvider,
  createDefaultModelFactory,
  Space,
  STATUS_TIMEOUT,
} from '@dxos/client-protocol';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { DatabaseRouter, EchoSchema } from '@dxos/echo-schema';
import { ApiError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { trace } from '@dxos/protocols';
import { Invitation, SystemStatus, SystemStatusResponse } from '@dxos/protocols/proto/dxos/client/services';
import { isNode } from '@dxos/util';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { Monitor } from '../diagnostics';
import { PropertiesProps } from '../proto';
import { EchoProxy, HaloProxy, MeshProxy } from '../proxies';
import { SpaceSerializer } from './serializer';
import { fromHost, fromIFrame } from './utils';

// TODO(burdon): Define package-specific errors.

/**
 * This options object configures the DXOS Client
 */
export type ClientOptions = {
  /** client configuration object */
  config?: Config;
  /** custom services provider */
  services?: ClientServicesProvider;
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

  private readonly _config: Config;
  private readonly _modelFactory: ModelFactory;
  private readonly _services: ClientServicesProvider;
  private readonly _halo: HaloProxy;
  private readonly _echo: EchoProxy;
  private readonly _mesh: MeshProxy;
  private readonly _monitor: Monitor;
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

  // prettier-ignore
  constructor({
    config,
    modelFactory,
    services
  }: ClientOptions = {}) {
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      !window.location.origin.includes('localhost')
    ) {
      console.warn(`DXOS Client will not function in a non-secure context ${window.location.origin}. Either serve with a certificate or use a tunneling service (https://docs.dxos.org/guide/kube/tunneling.html).`);
    }

    this._config = config ?? new Config();
    this._services = services ?? (isNode() ? fromHost(this._config) : fromIFrame(this._config));

    // NOTE: Must currently match the host.
    this._modelFactory = modelFactory ?? createDefaultModelFactory();

    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory);
    this._mesh = new MeshProxy(this._services);
    this._monitor = new Monitor(this._services);
    this._halo._traceParent = this._instanceId;
    this._echo._traceParent = this._instanceId;
    this._mesh._traceParent = this._instanceId;

    // TODO(wittjosiah): Reconcile this with @dxos/log loading config from localStorage.
    const filter = this.config.get('runtime.client.log.filter');
    if (filter) {
      const prefix = this.config.get('runtime.client.log.prefix');
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

    await this._services.open();

    // TODO(burdon): Remove?
    // TODO(dmaretskyi): Refactor devtools init.
    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._services);
    }

    assert(this._services.services.SystemService, 'SystemService is not available.');

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
    assert(this._services.services.SystemService, 'SystemService is not available.');
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

    assert(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services?.SystemService.reset();
    await this.destroy();
    // this._halo.identityChanged.emit(); // TODO(burdon): Triggers failure in hook.
    this._initialized = false;
  }

  /**
   * @deprecated
   */
  createSerializer() {
    return new SpaceSerializer(this._echo);
  }
}
