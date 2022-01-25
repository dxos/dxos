//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { Config, ConfigObject, ConfigV1Object, defs } from '@dxos/config';
import { InvalidParameterError, TimeoutError } from '@dxos/debug';
import { OpenProgress, sortItemsTopologically } from '@dxos/echo-db';
import { DatabaseSnapshot } from '@dxos/echo-protocol';
import { ModelConstructor } from '@dxos/model-factory';
import { ValueUtil } from '@dxos/object-model';
import { RpcPort } from '@dxos/rpc';

import { EchoProxy, HaloProxy } from '../api';
import { DevtoolsHook } from '../devtools';
import { ClientServiceProvider, ClientServices, RemoteServiceConnectionTimeout } from '../interfaces';
import { System } from '../proto/gen/dxos/config';
import { createWindowMessagePort, isNode } from '../util';
import { ClientServiceHost } from './service-host';
import { ClientServiceProxy } from './service-proxy';
import { InvalidConfigurationError } from '../interfaces/errors';

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

    if(Object.keys(this._config.values).length > 0 && this._config.values.version === EXPECTED_CONFIG_VERSION) {
      throw new InvalidConfigurationError('Client requires config version 1.');
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

    this._halo._open();
    this._echo._open();

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
    await this.services.SystemService.Reset();
    this._initialized = false;
  }

  /**
   * This is a minimal solution for party restoration functionality.
   * It has limitations and hacks:
   * - We have to treat some models in a special way, this is not a generic solution
   * - We have to recreate relationship between old IDs in newly created IDs
   * - This won't work when identities are required, e.g. in chess.
   * This solution is appropriate only for short term, expected to work only in Teamwork
   */
  @synchronized
  async createPartyFromSnapshot (snapshot: DatabaseSnapshot) {
    const party = await this.echo.createParty();
    const items = snapshot.items ?? [];

    // We have a brand new item ids after creation, which breaks the old structure of id-parentId mapping.
    // That's why we have a mapping of old ids to new ids, to be able to recover the child-parent relations.
    const oldToNewIdMap = new Map<string, string>();

    for (const item of sortItemsTopologically(items)) {
      assert(item.itemId);
      assert(item.modelType);
      assert(item.model);

      const model = this.echo.modelFactory.getModel(item.modelType);
      if (!model) {
        console.warn('No model found in model factory (could need registering first): ', item.modelType);
        continue;
      }

      let parentId: string | undefined;
      if (item.parentId) {
        parentId = oldToNewIdMap.get(item.parentId);
        assert(parentId, 'Unable to recreate child-parent relationship - missing map record');
        const parentItem = await party.database.getItem(parentId);
        assert(parentItem, 'Unable to recreate child-parent relationship - parent not created');
      }

      const createdItem = await party.database.createItem({
        model: model.constructor,
        type: item.itemType,
        parent: parentId
      });

      oldToNewIdMap.set(item.itemId, createdItem.id);

      if (item.model.array) {
        for (const mutation of item.model.array.mutations || []) {
          const decodedMutation = model.meta.mutation.decode(mutation.mutation);
          await (createdItem.model as any).write(decodedMutation);
        }
      } else if (item.modelType === 'dxos:model/object') {
        assert(item?.model?.custom);
        assert(model.meta.snapshotCodec);
        assert(createdItem?.model);

        const decodedItemSnapshot = model.meta.snapshotCodec.decode(item.model.custom);
        const obj: any = {};
        assert(decodedItemSnapshot.root);
        ValueUtil.applyValue(obj, 'root', decodedItemSnapshot.root);

        // The planner board models have a structure in the object model, which needs to be recreated on new ids.
        if (item.itemType === 'dxos.org/type/planner/card' && obj.root.listId) {
          obj.root.listId = oldToNewIdMap.get(obj.root.listId);
          assert(obj.root.listId, 'Failed to recreate child-parent structure of a planner card');
        }

        await createdItem.model.setProperties(obj.root);
      } else if (item.modelType === 'dxos:model/text') {
        assert(item?.model?.custom);
        assert(model.meta.snapshotCodec);
        assert(createdItem?.model);

        const decodedItemSnapshot = model.meta.snapshotCodec.decode(item.model.custom);

        await createdItem.model.restoreFromSnapshot(decodedItemSnapshot);
      } else {
        throw new InvalidParameterError(`Unhandled model type: ${item.modelType}`);
      }
    }

    return party;
  }

  //
  // ECHO.
  //

  /**
   * Registers a new ECHO model.
   */
  // TODO(burdon): Expose echo directly?
  registerModel (constructor: ModelConstructor<any>): this {
    this.echo.modelFactory.registerModel(constructor);
    return this;
  }

  //
  // Deprecated.
  // TODO(burdon): Separate wrapper for devtools?
  //

  /**
   * Returns devtools context.
   * Used by the DXOS DevTool Extension.
   *
   * @deprecated Service host implements the devtools service itself. This is left for legacy devtools versions.
   */
  getDevtoolsContext (): DevtoolsHook {
    const devtoolsContext: DevtoolsHook = {
      client: this,
      serviceHost: this._serviceProvider
    };

    return devtoolsContext;
  }
}
