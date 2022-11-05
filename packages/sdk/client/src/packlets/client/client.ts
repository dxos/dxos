//
// Copyright 2022 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { synchronized } from '@dxos/async';
import {
  ClientServicesHost,
  ClientServicesProxy,
  HaloSigner,
  InvalidConfigurationError,
  RemoteServiceConnectionTimeout,
  createNetworkManager,
  ClientServicesProvider
} from '@dxos/client-services';
import { Config, ConfigProto } from '@dxos/config';
import { InvalidParameterError, TimeoutError } from '@dxos/debug';
import { ModelConstructor, ModelFactory } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { RpcPort } from '@dxos/rpc';
import { createIFrame, createIFramePort } from '@dxos/rpc-tunnel';
import { isNode } from '@dxos/util';

import { DXOS_VERSION } from '../../version';
import { createDevtoolsRpcServer } from '../devtools';
import { EchoProxy, HaloProxy, OpenProgress } from '../proxies';
import { DEFAULT_CLIENT_ORIGIN, EXPECTED_CONFIG_VERSION, defaultConfig } from './config';

const log = debug('dxos:client-proxy');

const IFRAME_ID = '__DXOS_CLIENT__';

export interface ClientInfo {
  initialized: boolean;
  echo: EchoProxy['info'];
  halo: HaloProxy['info'];
}

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

/**
 * Main API.
 */
export class Client {
  public readonly version = DXOS_VERSION;

  private readonly _config: Config;
  private readonly _options: ClientOptions;
  private readonly _mode: Runtime.Client.Mode;

  private readonly _modelFactory = new ModelFactory().registerModel(ObjectModel);

  private _initialized = false;
  private _clientServices!: ClientServicesProvider;
  private _halo!: HaloProxy;
  private _echo!: EchoProxy;

  // TODO(burdon): Expose some kind of stable ID (e.g., from HALO, MESH).

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  // TODO(burdon): What are the defaults if `{}` is passed?
  // prettier-ignore
  constructor(
    config: ConfigProto | Config = defaultConfig,
    options: ClientOptions = {}
  ) {
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

  get modelFactory() {
    return this._modelFactory;
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

  private get timeout() {
    return this._options.timeout ?? 10_000;
  }

  /**
   * Initializes internal resources in an idempotent way.
   * Required before using the Client instance.
   */
  @synchronized
  // TODO(burdon): Rename open; remove callback (return observer).
  async initialize(onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._initialized) {
      return;
    }

    const timeout = setTimeout(() => {
      // TODO(burdon): Tie to global error handling (or event).
      throw new TimeoutError(`Initialize timed out after ${this.timeout}ms.`);
    }, this.timeout);

    await this._initialize(onProgressCallback);

    if (typeof window !== 'undefined') {
      await createDevtoolsRpcServer(this, this._clientServices);
    }

    this._halo = new HaloProxy(this._clientServices);
    this._echo = new EchoProxy(this._clientServices, this._modelFactory, this._halo);

    await this._halo._open();
    await this._echo._open();

    this._initialized = true; // TODO(burdon): Initialized === halo.initialized?
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  // TODO(burdon): Rename close (make sure re-entrant).
  async destroy() {
    await this._echo._close();
    await this._halo._close();

    if (!this._initialized) {
      return;
    }

    await this._clientServices.close();
    this._initialized = false;
  }

  private initializeIFramePort() {
    const source = new URL(
      this._config.get('runtime.client.remoteSource') ?? DEFAULT_CLIENT_ORIGIN,
      window.location.origin
    );
    const iframe = createIFrame(source.toString(), IFRAME_ID);
    // TODO(wittjosiah): Use well-known channel constant.
    return createIFramePort({
      origin: source.origin,
      iframe,
      channel: 'dxos:app'
    });
  }

  /**
   * Resets and destroys client storage.
   * Warning: Inconsistent state after reset, do not continue to use this client instance.
   */
  // TODO(burdon): Should not require reloading the page (make re-entrant).
  //   Recreate echo instance? Big impact on hooks. Test.
  @synchronized
  async reset() {
    await this._clientServices.services?.SystemService.reset();
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

  //
  // Client initialization.
  // TODO(burdon): These should be separate bundles.
  //

  private async _initialize(onProgressCallback: Parameters<this['initialize']>[0]) {
    switch (this._mode) {
      case Runtime.Client.Mode.REMOTE: {
        await this._initializeRemote(onProgressCallback);
        break;
      }

      case Runtime.Client.Mode.LOCAL: {
        await this._initializeLocal(onProgressCallback);
        break;
      }

      default: {
        await this._initializeAuto(onProgressCallback);
      }
    }
  }

  private async _initializeAuto(onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      await this._initializeLocal(onProgressCallback);
    } else {
      try {
        await this._initializeRemote(onProgressCallback);
      } catch (err) {
        if (err instanceof RemoteServiceConnectionTimeout) {
          log('Failed to connect to remote services. Starting local services.');
          document.getElementById(IFRAME_ID)?.remove();
          await this._clientServices.close();
          await this._initializeLocal(onProgressCallback);
        } else {
          throw err;
        }
      }
    }
  }

  // TODO(wittjosiah): Factor out local mode so that ClientServices can be tree shaken out of bundles.
  private async _initializeLocal(onProgressCallback: Parameters<this['initialize']>[0]) {
    log('Creating client host.');
    this._clientServices = new ClientServicesHost({
      config: this._config,
      modelFactory: this._modelFactory,
      networkManager: createNetworkManager(this._config)
    });

    await this._clientServices.open();
  }

  private async _initializeRemote(onProgressCallback: Parameters<this['initialize']>[0]) {
    if (!this._options.rpcPort && isNode()) {
      throw new Error('RPC port is required to run client in remote mode on Node environment.');
    }

    log('Creating client proxy.');
    this._clientServices = new ClientServicesProxy(
      this._options.rpcPort ?? this.initializeIFramePort(),
      this.timeout / 2
    );

    await this._clientServices.open();
  }
}
