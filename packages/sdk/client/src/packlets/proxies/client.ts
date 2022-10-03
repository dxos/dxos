//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import {
  ClientServiceProvider,
  ClientServices,
  ClientServiceHost,
  HaloSigner,
  InvalidConfigurationError,
  RemoteServiceConnectionTimeout
} from '@dxos/client-services';
import { Config, ConfigProto } from '@dxos/config';
import { InvalidParameterError, TimeoutError } from '@dxos/debug';
import { ModelConstructor } from '@dxos/model-factory';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';
import { isNode } from '@dxos/util';

import { createDevtoolsRpcServer } from './devtools';
import { EchoProxy } from './echo-proxy';
import { HaloProxy } from './halo-proxy';
import { ClientServiceProxy } from './service-proxy';
import { OpenProgress } from './stubs';
import { DXOS_VERSION } from './version';

const log = debug('dxos:client-proxy');

// TODO(wittjosiah): Should be kube.local or equivalent.
const DEFAULT_CLIENT_ORIGIN = 'http://localhost:3967';
const IFRAME_ID = '__DXOS_CLIENT__';
const EXPECTED_CONFIG_VERSION = 1;

export const defaultConfig: ConfigProto = { version: 1 };

export const defaultTestingConfig: ConfigProto = {
  version: 1,
  runtime: {
    services: {
      signal: {
        server: 'ws://localhost:4000/.well-known/dx/signal'
      }
    }
  }
};

export interface ClientOptions {
  /**
   * Only used when remote=true.
   */
  rpcPort?: RpcPort

  /**
   *
   */
  serviceProvider?: ClientServiceProvider

  /**
   *
   */
  signer?: HaloSigner

  /**
   *
   */
  timeout?: number
}

export interface ClientInfo {
  initialized: boolean
  echo: EchoProxy['info']
  halo: HaloProxy['info']
}

export class Client {
  public readonly version = DXOS_VERSION;

  private readonly _config: Config;
  private readonly _options: ClientOptions;
  private readonly _mode: Runtime.Client.Mode;

  private _initialized = false;
  private _serviceProvider!: ClientServiceProvider;
  private _halo!: HaloProxy;
  private _echo!: EchoProxy;

  // TODO(burdon): Expose some kind of stable ID (e.g., from HALO).

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  // TODO(burdon): What are the defaults if `{}` is passed?
  constructor (config: ConfigProto | Config = defaultConfig, options: ClientOptions = {}) {
    if (typeof config !== 'object' || config == null) {
      throw new InvalidParameterError('Invalid config.');
    }

    this._config = (config instanceof Config) ? config : new Config(config);
    this._options = options;

    if (Object.keys(this._config.values).length > 0 && this._config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError(
        `Invalid config version: ${this._config.values.version} !== ${EXPECTED_CONFIG_VERSION}]`);
    }

    // TODO(burdon): Library should not set app-level globals.
    // debug.enable(this._config.values.runtime?.client?.debug ?? process.env.DEBUG ?? 'dxos:*:error');

    this._mode = this._config.get('runtime.client.mode', Runtime.Client.Mode.AUTOMATIC)!;
    log(`mode=${Runtime.Client.Mode[this._mode]}`);
  }

  toString () {
    return `Client(${JSON.stringify(this.info)})`;
  }

  get info (): ClientInfo {
    return {
      initialized: this.initialized,
      echo: this.echo.info,
      halo: this.halo.info
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

  // TODO(burdon): Expose mesh for messaging?

  /**
   * Client services that can be proxied.
   */
  // TODO(burdon): Remove from API?
  get services (): ClientServices {
    return this._serviceProvider.services;
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

    const t = this._options.timeout ?? 10000;
    const timeout = setTimeout(() => {
      // TODO(burdon): Tie to global error handling (or event).
      throw new TimeoutError(`Initialize timed out after ${t / 1000}s.`);
    }, t);

    if (this._mode === Runtime.Client.Mode.REMOTE) {
      await this.initializeRemote(onProgressCallback);
    } else if (this._mode === Runtime.Client.Mode.LOCAL) {
      await this.initializeLocal(onProgressCallback);
    } else {
      await this.initializeAuto(onProgressCallback);
    }

    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._serviceProvider);
    }

    this._halo = new HaloProxy(this._serviceProvider);
    this._echo = new EchoProxy(this._serviceProvider, this._halo);

    await this._halo._open();
    await this._echo._open();

    this._initialized = true; // TODO(burdon): Initialized === halo.initialized?
    clearInterval(timeout);
  }

  private initializeIFramePort () {
    const source = new URL(this._config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN);
    const iframe = createIFrame(source.toString(), IFRAME_ID);
    return createIFramePort({ origin: source.origin, iframe });
  }

  private async initializeRemote (onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      throw new Error('RPC port is required to run client in remote mode on Node environment.');
    }

    log('Creating client proxy.');
    this._serviceProvider = new ClientServiceProxy(this._options.rpcPort ?? this.initializeIFramePort());
    await this._serviceProvider.open(onProgressCallback);
  }

  // TODO(wittjosiah): Factor out local mode so that ClientServices can be tree shaken out of bundles.
  private async initializeLocal (onProgressCallback: Parameters<this['initialize']>[0]) {
    log('Creating client host.');
    this._serviceProvider = new ClientServiceHost(this._config, this._options.signer);
    await this._serviceProvider.open(onProgressCallback);
  }

  private async initializeAuto (onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      await this.initializeLocal(onProgressCallback);
    } else {
      try {
        await this.initializeRemote(onProgressCallback);
      } catch (err) {
        if (err instanceof RemoteServiceConnectionTimeout) {
          log('Failed to connect to remote services. Starting local services.');
          document.getElementById(IFRAME_ID)?.remove();
          await this._serviceProvider.close();
          await this.initializeLocal(onProgressCallback);
        } else {
          throw err;
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
    this._halo.profileChanged.emit();
    this._initialized = false;
  }

  /**
   * Registers a new ECHO model.
   * @deprecated
   */
  // TODO(burdon): Remove (moved to echo).
  registerModel (constructor: ModelConstructor<any>): this {
    this._echo.modelFactory.registerModel(constructor);
    return this;
  }
}
