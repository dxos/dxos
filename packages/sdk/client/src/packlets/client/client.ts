//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { synchronized } from '@dxos/async';
import { InvalidConfigurationError, ClientServicesProvider, createDefaultModelFactory } from '@dxos/client-services';
import { Config, ConfigProto, fromConfig } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { ModelFactory } from '@dxos/model-factory';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { EchoProxy, HaloProxy } from '../proxies';
import { defaultConfig, EXPECTED_CONFIG_VERSION } from './config';
import { fromDefaults } from './utils';

// TODO(burdon): Define package-specific errors.

export type ClientOptions = {
  config?: Config | ConfigProto;
  services?: ClientServicesProvider;
  modelFactory?: ModelFactory;
};

/**
 * The Client class encapsulates DXOS's core client-side API.
 */
export class Client {
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
    this._config = fromConfig(config ?? defaultConfig);
    this._services = services ?? fromDefaults(this._config);
    // NOTE: Defaults to the same as the backend services.
    this._modelFactory = modelFactory ?? createDefaultModelFactory();

    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory, this._halo);

    if (Object.keys(this._config.values).length > 0 && this._config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError(
        `Invalid config version: ${this._config.values.version} !== ${EXPECTED_CONFIG_VERSION}]`
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

  get config(): Config {
    return this._config;
  }

  /**
   * Has the Client been initialized?
   * Initialize by calling `.initialize()`
   */
  // TODO(burdon): Rename isOpen.
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
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  // TODO(burdon): Rename open; remove callback (return observer).
  async initialize() {
    if (this._initialized) {
      return;
    }

    await this._services.open();

    // TODO(burdon): Remove?
    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._services);
    }

    await this._services.services.SystemService.init();

    await this._halo._open();
    await this._echo._open();

    // TODO(burdon): Initialized === halo.initialized?
    this._initialized = true;
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  // TODO(burdon): Rename close (make sure re-entrant).
  async destroy() {
    if (!this._initialized) {
      return;
    }

    await this._halo._close();
    await this._echo._close();

    await this._services.close();

    this._initialized = false;
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant). Rename destroy.
  @synchronized
  async reset() {
    await this._services.services?.SystemService.reset();
    this._halo.profileChanged.emit();
    this._initialized = false;
  }
}
