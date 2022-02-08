//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { Config, ConfigV1Object } from '@dxos/config';
import { InvalidParameterError, TimeoutError } from '@dxos/debug';
import { OpenProgress } from '@dxos/echo-db';
import { ModelConstructor } from '@dxos/model-factory';
import { RpcPort } from '@dxos/rpc';

import { EchoProxy, HaloProxy } from '../api';
import { DevtoolsHook } from '../devtools';
import { ClientServiceProvider, ClientServices, RemoteServiceConnectionTimeout } from '../interfaces';
import { InvalidConfigurationError } from '../interfaces/errors';
import { System } from '../proto/gen/dxos/config';
import { createWindowMessagePort, isNode } from '../util';
import { ClientServiceHost } from './service-host';
import { ClientServiceProxy } from './service-proxy';

const log = debug('dxos:client');

const EXPECTED_CONFIG_VERSION = 1;

export const defaultConfig: ConfigV1Object = { version: 1 };

export const defaultTestingConfig: ConfigV1Object = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000'
      }
    }
  }
};

export interface ClientOptions {
  /**
   * Only used when remote=true.
   */
  rpcPort?: RpcPort;
}

/**
 * The main DXOS client API.
 * An entrypoint to ECHO, HALO, MESH, and DXNS.
 */
export class Client {
  // TODO(burdon): Update version from package.
  public readonly version = '1.0.0';

  private readonly _config: Config;
  private readonly _options: ClientOptions;
  private readonly _mode: System.Mode;
  private _serviceProvider!: ClientServiceProvider;

  private _halo!: HaloProxy;
  private _echo!: EchoProxy;

  private _initialized = false;

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  constructor (config: ConfigV1Object | Config = { version: 1 }, options: ClientOptions = {}) {
    if (typeof config !== 'object' || config == null) {
      throw new InvalidParameterError('Invalid config.');
    }
    this._config = (config instanceof Config) ? config : new Config(config);

    if (Object.keys(this._config.values).length > 0 && this._config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError(`Expected config version 1, got ${this._config.values.version}.`);
    }

    this._options = options;

    // TODO(burdon): Default error level: 'dxos:*:error'
    // TODO(burdon): config.getProperty('system.debug', process.env.DEBUG, '');
    debug.enable(this._config.values.runtime?.system?.debug ?? process.env.DEBUG ?? 'dxos:*:error');

    this._mode = this._config.get('runtime.client.mode', System.Mode.AUTOMATIC)!;
    log(`mode=${System.Mode[this._mode]}`);
  }

  toString () {
    return `Client(${JSON.stringify(this.info())})`;
  }

  info () {
    return {
      initialized: this.initialized,
      echo: this.echo.info()
    };
  }

  get config (): Config {
    return this._config;
  }

  /**
   * Has the Client been initialized?
   * Initialize by calling `.initialize()`
   */
  get initialized () {
    return this._initialized;
  }

  /**
   * ECHO database.
   */
  get echo (): EchoProxy {
    assert(this._echo, 'Client not initialized.');
    return this._echo;
  }

  /**
   * HALO credentials.
   */
  get halo (): HaloProxy {
    assert(this._halo, 'Client not initialized.');
    return this._halo;
  }

  /**
   * Client services that can be proxied.
   */
  get services (): ClientServices {
    return this._serviceProvider.services;
  }

  /**
   * Returns true if client is connected to a remote services protvider.
   */
  get isRemote (): boolean {
    return this._serviceProvider instanceof ClientServiceProxy;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  async initialize (onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._initialized) {
      return;
    }

    const t = 10;
    const timeout = setTimeout(() => {
      // TODO(burdon): Tie to global error handling (or event).
      throw new TimeoutError(`Initialize timed out after ${t}s.`);
    }, t * 1000);

    if (this._mode === System.Mode.REMOTE) {
      await this.initializeRemote(onProgressCallback);
    } else if (this._mode === System.Mode.LOCAL) {
      await this.initializeLocal(onProgressCallback);
    } else {
      await this.initializeAuto(onProgressCallback);
    }

    this._halo = new HaloProxy(this._serviceProvider);
    this._echo = new EchoProxy(this._serviceProvider);

    await this._halo._open();
    await this._echo._open();

    this._initialized = true; // TODO(burdon): Initialized === halo.initialized?
    clearInterval(timeout);
  }

  private async initializeRemote (onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      throw new Error('RPC port is required to run client in remote mode on Node environment.');
    }

    log('Creating client proxy.');
    this._serviceProvider = new ClientServiceProxy(this._options.rpcPort ?? createWindowMessagePort());
    await this._serviceProvider.open(onProgressCallback);
  }

  private async initializeLocal (onProgressCallback: Parameters<this['initialize']>[0]) {
    log('Creating client host.');
    this._serviceProvider = new ClientServiceHost(this._config);
    await this._serviceProvider.open(onProgressCallback);
  }

  private async initializeAuto (onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      await this.initializeLocal(onProgressCallback);
    } else {
      try {
        await this.initializeRemote(onProgressCallback);
      } catch (error) {
        if (error instanceof RemoteServiceConnectionTimeout) {
          log('Failed to connect to remote services. Starting local services.');
          await this.initializeLocal(onProgressCallback);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  async destroy () {
    await this._echo._close();
    this._halo._close();

    if (!this._initialized) {
      return;
    }

    await this._serviceProvider.close();
    this._initialized = false;
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant).
  //   Recreate echo instance? Big impact on hooks. Test.
  @synchronized
  async reset () {
    await this.services.SystemService.reset();
    this._initialized = false;
  }

  /**
   * Registers a new ECHO model.
   */
  registerModel (constructor: ModelConstructor<any>): this {
    this.echo.modelFactory.registerModel(constructor);
    return this;
  }

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   *
   * This is what gets assigned to `window.__DXOS__` global.
   */
  getDevtoolsContext (): DevtoolsHook {
    const devtoolsContext: DevtoolsHook = {
      client: this,
      // TODO(dmaretskyi): Is serviceHost needed?
      serviceHost: this._serviceProvider
    };

    return devtoolsContext;
  }
}
