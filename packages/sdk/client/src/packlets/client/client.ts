//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { synchronized } from '@dxos/async';
import { ClientServicesProvider, createDefaultModelFactory } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { ApiError, InvalidConfigError } from '@dxos/errors';
import { ModelFactory } from '@dxos/model-factory';
import { Status } from '@dxos/protocols/proto/dxos/client';
import { GetNetworkModeResponse, NetworkMode } from '@dxos/protocols/proto/dxos/client/services';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { EchoProxy, HaloProxy } from '../proxies';
import { EXPECTED_CONFIG_VERSION } from './config';
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

  private _initialized = false;

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

    // TODO(burdon): Reconcile with Config.sanitizer.
    if (Object.keys(this._config.values).length > 0 && this._config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigError(
        'Invalid config version', { current: this._config.values.version, expected: EXPECTED_CONFIG_VERSION }
      );
    }
  }

  [inspect.custom]() {
    return inspectObject(this);
  }

  toJSON() {
    return {
      initialized: this.initialized,
      echo: this.echo,
      halo: this.halo
    };
  }

  /**
   * Current configuration object
   */
  get config(): Config {
    return this._config;
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
    return this._echo;
  }

  /**
   * Returns the current Network Mode of the Client.
   */
  get networkMode(): Promise<GetNetworkModeResponse> {
    return this._services.services.NetworkService.getNetworkMode();
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

    await this._services.services.SystemService.initSession();

    await this._halo.open();
    await this._echo.open();

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

    await this._services.close();

    this._initialized = false;
  }

  /**
   * Get system status.
   */
  async getStatus(): Promise<Status> {
    return this._services.services?.SystemService.getStatus();
  }

  /**
   * Set network mode. This is method to go to offline/online mode.
   */
  async setNetworkMode(mode: NetworkMode) {
    return this._services.services?.NetworkService.setNetworkMode({ mode });
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  async reset() {
    if (!this._initialized) {
      throw new ApiError('Client not open.');
    }

    await this._services.services?.SystemService.reset();
    await this.destroy();
    this._halo.profileChanged.emit();
    this._initialized = false;
  }

  createSerializer() {
    return new SpaceSerializer(this._echo);
  }
}
