//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { Config, defs } from '@dxos/config';
import { Invitation, SecretProvider } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { raise, TimeoutError, InvalidParameterError } from '@dxos/debug';
import { InvitationOptions, OpenProgress, PartyNotFoundError, sortItemsTopologically } from '@dxos/echo-db';
import { DatabaseSnapshot } from '@dxos/echo-protocol';
import { ModelConstructor } from '@dxos/model-factory';
import { ValueUtil } from '@dxos/object-model';

import { DevtoolsHook } from './devtools';
import { ClientServiceHost, LocalClientServiceHost } from './service-host';

export const defaultConfig: defs.Config = {};

export const defaultTestingConfig: defs.Config = {
  services: {
    signal: {
      server: 'ws://localhost:4000'
    }
  }
};

/**
 * Main DXOS client object.
 * An entrypoint to ECHO, HALO, DXNS.
 */
export class Client {
  private readonly _config: Config;

  private readonly _serviceHost: ClientServiceHost;

  private readonly _wnsRegistry?: any; // TODO(burdon): Remove.

  private _initialized = false;

  /**
   * Creates the client object based on supplied configuration.
   * Requires initialization after creating by calling `.initialize()`.
   */
  constructor (config: defs.Config | Config = {}) {
    if (config instanceof Config) {
      this._config = config;
    } else {
      this._config = new Config(config);
    }

    this._serviceHost = new LocalClientServiceHost(this._config);

    // TODO(burdon): Remove.
    this._wnsRegistry = undefined;
  }

  toString () {
    return `Client(${JSON.stringify(this.info())})`;
  }

  info () {
    return {
      initialized: this.initialized,
      halo: this.halo.info(),
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
  get echo () {
    return this._serviceHost.echo;
  }

  /**
   * HALO credentials.
   */
  get halo () {
    // TODO(burdon): Why is this constructed inside ECHO?
    return this._serviceHost.echo.halo;
  }

  /**
   * WNS registry.
   * @deprecated
   */
  // TODO(burdon): Remove.
  get wnsRegistry () {
    return this._wnsRegistry;
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

    await this._serviceHost.open(onProgressCallback);

    this._initialized = true;
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  async destroy () {
    if (!this._initialized) {
      return;
    }

    await this._serviceHost.close();
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
    await this._serviceHost.echo.reset();
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
    const party = await this._serviceHost.echo.createParty();
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

        // The planner board models have a structure in the object model, which needs to be recreated on new ids
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
      // TODO(marik-d): Probably an error here.
      secretValidator:
        async (invitation: Invitation, secret: Buffer) => secret && secret.equals((invitation as any).secret),
      secretProvider
    },
    options);
  }

  /**
   * Hook to create an Offline Invitation for a recipient to a given party.
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

  //
  // ECHO
  //

  /**
   * Registers a new ECHO model.
   */
  // TODO(burdon): Expose echo directly?
  registerModel (constructor: ModelConstructor<any>): this {
    this._serviceHost.echo.modelFactory.registerModel(constructor);
    return this;
  }

  //
  // Deprecated
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
      serviceHost: this._serviceHost
    };

    return devtoolsContext;
  }
}
