//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { synchronized } from '@dxos/async';
import { Config, defs } from '@dxos/config';
import { defaultSecretValidator, SecretProvider } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { InvalidParameterError, raise, TimeoutError } from '@dxos/debug';
import { InvitationDescriptor, InvitationOptions, OpenProgress, PartyNotFoundError, sortItemsTopologically } from '@dxos/echo-db';
import { DatabaseSnapshot } from '@dxos/echo-protocol';
import { ModelConstructor } from '@dxos/model-factory';
import { ValueUtil } from '@dxos/object-model';
import { RpcPort } from '@dxos/rpc';

import { CreateInvitationOptions, HaloProxy } from './api/HaloProxy';
import { DevtoolsHook } from './devtools';
import { ClientServiceProvider, ClientServices } from './interfaces';
import { isNode } from './platform';
import { ClientServiceHost } from './service-host';
import { ClientServiceProxy } from './service-proxy';
import { createWindowMessagePort } from './util';
import { EchoProxy } from './api/EchoProxy';

const log = debug('dxos:client');

export const defaultConfig: defs.Config = {};

export const defaultTestingConfig: defs.Config = {
  services: {
    signal: {
      server: 'ws://localhost:4000'
    }
  }
};

export interface ClientConstructorOpts {
  /**
   * Only used when remote=true.
   */
  rpcPort?: RpcPort;
}

/**
 * Main DXOS client object.
 * An entrypoint to ECHO, HALO, DXNS.
 */
export class Client {
  private readonly _config: Config;

  private readonly _serviceProvider: ClientServiceProvider;

  private readonly _halo: HaloProxy;
  private readonly _echo: EchoProxy;

  private _initialized = false;

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  constructor (config: defs.Config | Config = {}, opts: ClientConstructorOpts = {}) {
    if (config instanceof Config) {
      this._config = config;
    } else {
      this._config = new Config(config);
    }
    debug.enable(this._config.values.system?.debug ?? process.env.DEBUG ?? '');

    if (this._config.values.system?.remote) {
      if (!opts.rpcPort && isNode()) {
        throw new Error('RPC port is required to run client in remote mode on Node environment.');
      }
      log('Creating client in *REMOTE* mode.');
      this._serviceProvider = new ClientServiceProxy(opts.rpcPort ?? createWindowMessagePort());
    } else {
      log('Creating client in *LOCAL* mode.');
      this._serviceProvider = new ClientServiceHost(this._config);
    }

    this._halo = new HaloProxy(this._serviceProvider);
    this._echo = new EchoProxy(this._serviceProvider);
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
    return this._echo;
  }

  /**
   * HALO credentials.
   */
  get halo (): HaloProxy {
    return this._halo;
  }

  /**
   * Client services that can be proxied.
   */
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

    const t = 10;
    const timeout = setTimeout(() => {
      throw new TimeoutError(`Initialize timed out after ${t}s.`);
    }, t * 1000);

    await this._serviceProvider.open(onProgressCallback);

    this._halo.open();

    this._initialized = true;
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  async destroy () {
    this._halo.close();

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
    await this.echo.reset();
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
      } else if (item.modelType === 'dxn://dxos.org/model/object') {
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
      } else if (item.modelType === 'dxn://dxos.org/model/text') {
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

  /**
   * Creates an invitation to a given party.
   * The Invitation flow requires the inviter and invitee to be online at the same time.
   * If the invitee is known ahead of time, `createOfflineInvitation` can be used instead.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param secretProvider supplies the pin code
   * @param options.onFinish A function to be called when the invitation is closed (successfully or not).
   * @param options.expiration Date.now()-style timestamp of when this invitation should expire.
   */
  async createInvitation (partyKey: PublicKey, secretProvider: SecretProvider, options?: InvitationOptions) {
    const party = await this.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createInvitation({
      secretValidator: defaultSecretValidator,
      secretProvider
    },
    options);
  }

  /**
   * Function to create an Offline Invitation for a recipient to a given party.
   * Offline Invitation, unlike regular invitation, does NOT require
   * the inviter and invitee to be online at the same time - hence `Offline` Invitation.
   * The invitee (recipient) needs to be known ahead of time.
   * Invitation it not valid for other users.
   *
   * To be used with `client.echo.joinParty` on the invitee side.
   *
   * @param partyKey the Party to create the invitation for.
   * @param recipientKey the invitee (recipient for the invitation).
   */
  // TODO(burdon): Move to party.
  async createOfflineInvitation (partyKey: PublicKey, recipientKey: PublicKey) {
    const party = await this.echo.getParty(partyKey) ?? raise(new PartyNotFoundError(partyKey));
    return party.createOfflineInvitation(recipientKey);
  }

  /**
   * Creates an invitation to a HALO party.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.joinHaloInvitation` on the invitee side.
   *
   * @param options.onFinish A function to be called when the invitation is closed (successfully or not).
   * @param options.expiration Date.now()-style timestamp of when this invitation should expire.
   */
  async createHaloInvitation (options?: CreateInvitationOptions) {
    return await this.halo.createInvitation(options);
  }

  /**
   * Creates an invitation to a HALO party.
   * Used to authorize another device of the same user.
   * The Invitation flow requires the inviter device and invitee device to be online at the same time.
   * The invitation flow is protected by a generated pin code.
   *
   * To be used with `client.createHaloInvitation` on the inviter side.
   *
   * @returns An async function to provide secret and finishing the invitation process.
  */
  async joinHaloInvitation (invitationDescriptor: InvitationDescriptor) {
    return await this.halo.acceptInvitation(invitationDescriptor);
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
