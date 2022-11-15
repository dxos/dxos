//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';
import { inspect } from 'node:util';

import { synchronized, Trigger } from '@dxos/async';
import {
  InvalidConfigurationError,
  ClientServicesProvider,
  createDefaultModelFactory,
  ClientServicesHost,
  ClientServicesProxy
} from '@dxos/client-services';
import { Config, ConfigLike } from '@dxos/config';
import { inspectObject } from '@dxos/debug';
import { log } from '@dxos/log';
import { ModelFactory } from '@dxos/model-factory';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';
import { getAsyncValue, Provider } from '@dxos/util';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { EchoProxy, HaloProxy } from '../proxies';
import { DEFAULT_CONFIG_CHANNEL, EXPECTED_CONFIG_VERSION, IFRAME_ID } from './config';
import { createNetworkManager } from './utils';

// TODO(burdon): Define package-specific errors.

export type ClientOptions = {
  config?: ConfigLike | Provider<Promise<ConfigLike>>;
  services?: ClientServicesProvider | Provider<ClientServicesProvider, Config>;
  modelFactory?: ModelFactory;
};

/**
 * The Client class encapsulates DXOS's core client-side API.
 */
// TODO(wittjosiah): Wire up lazy initialization.
export class Client {
  public readonly version = DXOS_VERSION;

  private readonly _configReady = new Trigger<Config | undefined>();
  private readonly _servicesProvider: ClientOptions['services'];
  private readonly _modelFactory: ModelFactory;
  private _config?: Config;
  private _services?: ClientServicesProvider;
  private _halo?: HaloProxy;
  private _echo?: EchoProxy;

  private _initialized = false;

  // prettier-ignore
  constructor({
    config: configProvider,
    services: servicesProvider,
    modelFactory
  }: ClientOptions = {}) {
    void (configProvider
      ? getAsyncValue(configProvider).then(config => {
        this._configReady.wake(new Config(config));
      })
      : this._configReady.wake(undefined));
    this._servicesProvider = servicesProvider;
    // NOTE: Defaults to the same as the backend services.
    this._modelFactory = modelFactory ?? createDefaultModelFactory();
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
    assert(this._config, 'Client not initialized.');
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
    assert(this._halo, 'Client not initialized.');
    return this._halo;
  }

  /**
   * ECHO database.
   */
  get echo(): EchoProxy {
    assert(this._echo, 'Client not initialized.');
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
    log('initializing...');

    this._config = await this._configReady.wait();
    const remoteSource = this._config?.get('runtime.client.remoteSource');
    if (this._servicesProvider) {
      log('using services provider...');
      this._services = await getAsyncValue(this._servicesProvider, this.config);
    } else if (remoteSource) {
      log('using remote source...', { remoteSource });
      const source = new URL(remoteSource, window.location.origin);
      const iframe = createIFrame(source.toString(), IFRAME_ID);
      const iframePort = createIFramePort({
        origin: source.origin,
        iframe,
        channel: DEFAULT_CONFIG_CHANNEL
      });
      this._services = new ClientServicesProxy(iframePort);
    } else {
      log('using services host...');
      this._services = new ClientServicesHost({
        config: this._config!,
        modelFactory: this._modelFactory,
        // TODO(wittjosiah): Remove helper function.
        networkManager: createNetworkManager(this._config!)
      });
    }

    this._halo = new HaloProxy(this._services);
    this._echo = new EchoProxy(this._services, this._modelFactory, this._halo);

    if (Object.keys(this.config.values).length > 0 && this.config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError(
        `Invalid config version: ${this.config.values.version} !== ${EXPECTED_CONFIG_VERSION}]`
      );
    }

    await this._services.open();

    // TODO(burdon): Remove?
    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._services);
    }

    await this._halo._open();
    await this._echo._open();

    if (
      this.config.get('runtime.client.services.identity.mode') ===
        Runtime.Client.Services.Identity.Mode.AUTO_INITIALIZE &&
      !this._halo.profile
    ) {
      await this._services.services.ProfileService.createProfile({
        displayName: this.config.get('runtime.client.services.identity.displayName')
      });
    }

    // TODO(burdon): Initialized === halo.initialized?
    this._initialized = true;
    log('initialized');
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

    await this._halo?._close();
    await this._echo?._close();

    await this._services?.close();

    this._initialized = false;
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant). Rename destroy.
  @synchronized
  async reset() {
    await this._services?.services?.SystemService.reset();
    this._halo?.profileChanged.emit();
    this._initialized = false;
  }
}
