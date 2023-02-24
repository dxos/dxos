//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { Event, synchronized, Trigger, UnsubscribeCallback } from '@dxos/async';
import { ClientServicesProvider, createDefaultModelFactory } from '@dxos/client-services';
import type { Stream } from '@dxos/codec-protobuf';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { ApiError } from '@dxos/errors';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Status, StatusResponse } from '@dxos/protocols/proto/dxos/client/services';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { EchoProxy, HaloProxy, MeshProxy } from '../proxies';
import { SpaceSerializer } from './serializer';
import { fromIFrame } from './utils';

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
  private readonly _statusUpdate = new Event<Status | undefined>();

  private _initialized = false;
  private _statusStream?: Stream<StatusResponse>;
  private _status?: Status;

  // prettier-ignore
  constructor({
    config,
    modelFactory,
    services
  }: ClientOptions = {}) {
    this._config = config ?? new Config();
    this._services = services ?? fromIFrame(this._config);

    // NOTE: Must currently match the host.
    this._modelFactory = modelFactory ?? createDefaultModelFactory();

    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory, this._halo);
    this._mesh = new MeshProxy(this._services);

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
      echo: this.echo,
      halo: this.halo,
      mesh: this.mesh
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
   * HALO credentials.
   */
  get halo(): HaloProxy {
    assert(this._initialized, 'Client not initialized.');
    return this._halo;
  }

  /**
   * ECHO database.
   */
  get echo(): EchoProxy {
    assert(this._initialized, 'Client not initialized.');
    // if (!this.halo.identity) {
    //   throw new ApiError('This device has no HALO identity available. See https://docs.dxos.org/guide/halo');
    // }

    return this._echo;
  }

  get mesh(): MeshProxy {
    assert(this._initialized, 'Client not initialized.');
    return this._mesh;
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

    await this._services.open();

    // TODO(burdon): Remove?
    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._services);
    }

    assert(this._services.services.SystemService, 'SystemService is not available.');

    let timeout: NodeJS.Timeout | undefined;
    const trigger = new Trigger<Error | undefined>();
    this._statusStream = this._services.services.SystemService.queryStatus();
    this._statusStream.subscribe(
      async ({ status }) => {
        timeout && clearTimeout(timeout);
        trigger.wake(undefined);

        this._status = status;
        this._statusUpdate.emit(this._status);

        timeout = setTimeout(() => {
          this._status = undefined;
          this._statusUpdate.emit(this._status);
        }, 5000);
      },
      (err) => {
        trigger.wake(err);
        this._status = undefined;
        this._statusUpdate.emit(this._status);
      }
    );

    const err = await trigger.wait();
    if (err) {
      throw err;
    }

    // TODO(wittjosiah): Promise.all?
    await this._halo.open();
    await this._echo.open();
    await this._mesh.open();

    this._initialized = true;
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

    await this._halo.close();
    await this._echo.close();
    await this._mesh.close();

    this._statusStream!.close();
    await this._services.close();

    this._initialized = false;
  }

  getStatus(): Status | undefined {
    return this._status;
  }

  /**
   * Observe the system status.
   */
  subscribeStatus(callback: (status: Status | undefined) => void): UnsubscribeCallback {
    return this._statusUpdate.on(callback);
  }

  /**
   * Reinitialized the client session with the remote service host.
   * This is useful when connecting to a host running behind a resource lock
   * (e.g., HALO when SharedWorker is unavailable).
   */
  async resumeHostServices(): Promise<void> {
    assert(this._services.services.SystemService, 'SystemService is not available.');
    await this._services.services.SystemService.updateStatus({ status: Status.ACTIVE });
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

  createSerializer() {
    return new SpaceSerializer(this._echo);
  }
}
