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
  RemoteServiceConnectionTimeout,
  createNetworkManager
} from '@dxos/client-services';
import { Config, ConfigProto } from '@dxos/config';
import { InvalidParameterError, TimeoutError } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { ModelConstructor, ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort, removeIFrame } from '@dxos/rpc-tunnel';
import { isNode } from '@dxos/util';

import { createDevtoolsRpcServer } from './devtools';
import { EchoProxy } from './echo-proxy';
import { HaloProxy } from './halo-proxy';
import { ClientServiceProxy } from './service-proxy';
import { OpenProgress } from './stubs';
import { DXOS_VERSION } from './version';

const log = debug('dxos:client-proxy');

export const DEFAULT_CLIENT_ORIGIN = 'https://halo.dxos.org/headless.html';
const EXPECTED_CONFIG_VERSION = 1;

export const defaultConfig: ConfigProto = { version: 1 };

export const defaultTestingConfig: ConfigProto = {
  version: 1,
  runtime: {
    client: {
      mode: Runtime.Client.Mode.LOCAL
    },
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
  rpcPort?: RpcPort;

  /**
   *
   */
  signer?: HaloSigner;

  /**
   *
   */
  timeout?: number;
}

export interface ClientInfo {
  initialized: boolean;
  echo: EchoProxy['info'];
  halo: HaloProxy['info'];
}

export class Client {
  private _iframeId?: string;

  public readonly version = DXOS_VERSION;

  private readonly _config: Config;
  private readonly _options: ClientOptions;
  private readonly _mode: Runtime.Client.Mode;

  private readonly _modelFactory = new ModelFactory().registerModel(ObjectModel);

  private _initialized = false;
  private _serviceProvider!: ClientServiceProvider;
  private _halo!: HaloProxy;
  private _echo!: EchoProxy;

  // TODO(burdon): Expose some kind of stable ID (e.g., from HALO, MESH).

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  // TODO(burdon): What are the defaults if `{}` is passed?
  constructor(config: ConfigProto | Config = defaultConfig, options: ClientOptions = {}) {
    if (typeof config !== 'object' || config == null) {
      throw new InvalidParameterError('Invalid config.');
    }

    this._config = config instanceof Config ? config : new Config(config);
    this._options = options;

    if (Object.keys(this._config.values).length > 0 && this._config.values.version !== EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError(
        `Invalid config version: ${this._config.values.version} !== ${EXPECTED_CONFIG_VERSION}]`
      );
    }

    this._mode = this._config.get('runtime.client.mode', Runtime.Client.Mode.AUTOMATIC)!;
    log(`mode=${Runtime.Client.Mode[this._mode]}`);
  }

  toString() {
    return `Client(${JSON.stringify(this.info)})`;
  }

  get info(): ClientInfo {
    return {
      initialized: this.initialized,
      echo: this.echo.info,
      halo: this.halo.info
    };
  }

  get config(): Config {
    return this._config;
  }

  /**
   * Has the Client been initialized?
   * Initialize by calling `.initialize()`
   */
  get initialized() {
    return this._initialized;
  }

  /**
   * ECHO database.
   */
  get echo(): EchoProxy {
    assert(this._echo, 'Client not initialized.');
    return this._echo;
  }

  /**
   * HALO credentials.
   */
  get halo(): HaloProxy {
    assert(this._halo, 'Client not initialized.');
    return this._halo;
  }

  // TODO(burdon): Expose mesh for messaging?

  /**
   * Client services that can be proxied.
   */
  // TODO(burdon): Remove from API?
  get services(): ClientServices {
    return this._serviceProvider.services;
  }

  private get timeout() {
    return this._options.timeout ?? 10_000;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  // TODO(burdon): Rename open.
  async initialize(onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._initialized) {
      return;
    }

    const timeout = setTimeout(() => {
      // TODO(burdon): Tie to global error handling (or event).
      throw new TimeoutError(`Initialize timed out after ${this.timeout}ms.`);
    }, this.timeout);

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
    this._echo = new EchoProxy(this._serviceProvider, this._modelFactory, this._halo);

    await this._halo._open();
    await this._echo._open();

    this._initialized = true; // TODO(burdon): Initialized === halo.initialized?
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  // TODO(burdon): Rename close.
  async destroy() {
    await this._echo._close();
    await this._halo._close();

    if (!this._initialized) {
      return;
    }

    if (this._iframeId) {
      removeIFrame(this._iframeId);
      this._iframeId = undefined;
    }

    await this._serviceProvider.close();
    this._initialized = false;
  }

  private initializeIFramePort() {
    this._iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
    const source = new URL(
      this._config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN,
      window.location.origin
    );
    const iframe = createIFrame(source.toString(), this._iframeId);
    // TODO(wittjosiah): Use well-known channel constant.
    return createIFramePort({
      origin: source.origin,
      iframe,
      channel: 'dxos:app'
    });
  }

  private async initializeRemote(onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      throw new Error('RPC port is required to run client in remote mode on Node environment.');
    }

    log('Creating client proxy.');
    this._serviceProvider = new ClientServiceProxy(
      this._options.rpcPort ?? this.initializeIFramePort(),
      this.timeout / 2
    );
    await this._serviceProvider.open(onProgressCallback);
  }

  // TODO(wittjosiah): Factor out local mode so that ClientServices can be tree shaken out of bundles.
  private async initializeLocal(onProgressCallback: Parameters<this['initialize']>[0]) {
    log('Creating client host.');
    this._serviceProvider = new ClientServiceHost({
      config: this._config,
      modelFactory: this._modelFactory,
      signer: this._options.signer,
      networkManager: createNetworkManager(this._config)
    });

    await this._serviceProvider.open(onProgressCallback);
  }

  private async initializeAuto(onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      await this.initializeLocal(onProgressCallback);
    } else {
      try {
        await this.initializeRemote(onProgressCallback);
      } catch (err) {
        if (err instanceof RemoteServiceConnectionTimeout) {
          log('Failed to connect to remote services. Starting local services.');
          if (this._iframeId) {
            removeIFrame(this._iframeId);
          }
          await this._serviceProvider.close();
          await this.initializeLocal(onProgressCallback);
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant).
  //   Recreate echo instance? Big impact on hooks. Test.
  @synchronized
  async reset() {
    await this.services.SystemService.reset();
    this._halo.profileChanged.emit();
    this._initialized = false;
  }

  /**
   * Registers a new ECHO model.
   * @deprecated
   */
  // TODO(burdon): Remove (moved to echo).
  registerModel(constructor: ModelConstructor<any>): this {
    this._modelFactory.registerModel(constructor);
    return this;
  }
}
