//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import jsondown from 'jsondown';
import leveljs from 'level-js';
import memdown from 'memdown';

import { synchronized } from '@dxos/async';
import { Keyring } from '@dxos/credentials';
import { humanize, PublicKey } from '@dxos/crypto';
import * as debug from '@dxos/debug';
import { ECHO, InvitationOptions, OpenProgress, SecretProvider, sortItemsTopologically } from '@dxos/echo-db';
import { DatabaseSnapshot } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { ModelConstructor } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ValueUtil } from '@dxos/object-model';
import { createStorage } from '@dxos/random-access-multi-storage';
import { raise } from '@dxos/util';
import { Registry } from '@wirelineio/registry-client';

import { DevtoolsContext } from './devtools-context';
import { isNode } from './platform';

export type StorageType = 'ram' | 'idb' | 'chrome' | 'firefox' | 'node';
export type KeyStorageType = 'ram' | 'leveljs' | 'jsondown';

// CAUTION: Breaking changes to this interface require corresponding changes in https://github.com/dxos/kube/blob/main/remote.yml
export interface ClientConfig {
  storage?: {
    persistent?: boolean,
    type?: StorageType,
    keyStorage?: KeyStorageType,
    path?: string
  },
  swarm?: {
    signal?: string | string[],
    ice?: {
      urls: string,
      username?: string,
      credential?: string,
    }[],
  },
  wns?: {
    server: string,
    chainId: string,
  },
  ipfs?: {
    server: string,
    gateway: string,
  }
  snapshots?: boolean
  snapshotInterval?: number,
  invitationExpiration?: number,
}

export interface CreateProfileOptions {
  publicKey?: Buffer
  secretKey?: Buffer
  username?: string
}

/**
 * Data client.
 */
export class Client {
  private readonly _config: ClientConfig;

  private readonly _echo: ECHO;

  private readonly _registry?: any;

  private _initialized = false;

  constructor (config: ClientConfig = {}) {
    this._config = config;
    // TODO(burdon): Make hierarchical (e.g., snapshot.[enabled, interval])
    const {
      storage = {},
      swarm = DEFAULT_SWARM_CONFIG,
      wns,
      snapshots = false,
      snapshotInterval
    } = config;

    const { feedStorage, keyStorage, snapshotStorage } = createStorageObjects(storage, snapshots);

    // TODO(burdon): Extract constants.
    this._echo = new ECHO({
      feedStorage,
      keyStorage,
      snapshotStorage,
      networkManagerOptions: {
        signal: swarm?.signal ? (Array.isArray(swarm.signal) ? swarm.signal : [swarm.signal]) : undefined,
        ice: swarm?.ice
      },
      snapshots,
      snapshotInterval
    });

    this._registry = wns ? new Registry(wns.server, wns.chainId) : undefined;
  }

  get config (): ClientConfig {
    return this._config;
  }

  get echo () {
    return this._echo;
  }

  get registry () {
    return this._registry;
  }

  get initialized () {
    return this._initialized;
  }

  /**
   * Initializes internal resources.
   */
  @synchronized
  async initialize (onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._initialized) {
      return;
    }

    const t = 10;
    const timeout = setTimeout(() => {
      throw new Error(`Initialize timed out after ${t}s.`);
    }, t * 1000);

    await this._echo.open(onProgressCallback);

    this._initialized = true;
    clearInterval(timeout);
  }

  /**
   * Cleanup, release resources.
   */
  @synchronized
  async destroy () {
    return this._destroy();
  }

  /**
   * Cleanup, release resources.
   * (To be called from @synchronized method)
   */
  private async _destroy () {
    if (!this._initialized) {
      return;
    }
    await this._echo.close();
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
    await this._echo.reset();
    await this._destroy();
  }

  //
  // HALO Profile
  //

  /**
   * Create Profile. Add Identity key if public and secret key are provided. Then initializes profile with given username.
   * If not public and secret key are provided it relies on keyring to contain an identity key.
   * @returns {ProfileInfo} User profile info.
   */
  // TODO(burdon): Breaks if profile already exists.
  // TODO(burdon): ProfileInfo is not imported or defined.
  @synchronized
  async createProfile ({ publicKey, secretKey, username }: CreateProfileOptions = {}) {
    if (this.getProfile()) {
      throw new Error('Profile already exists.');
    }

    // TODO(burdon): What if not set?
    if (publicKey && secretKey) {
      await this._echo.createIdentity({ publicKey, secretKey });
    }

    await this._echo.createHalo(username);

    return this.getProfile();
  }

  /**
   * @returns true if the profile exists.
   * @deprecated Use getProfile.
   */
  // TODO(burdon): Remove?
  hasProfile () {
    return this._echo.identityKey;
  }

  /**
   * @returns {ProfileInfo} User profile info.
   */
  // TODO(burdon): Change to property (currently returns a new object each time).
  getProfile () {
    if (!this._echo.identityKey) {
      return;
    }

    return {
      username: this._echo.identityDisplayName,
      // TODO(burdon): Why convert to string?
      publicKey: this._echo.identityKey.publicKey
    };
  }

  // TODO(burdon): Should be part of profile object. Or use standard Result object.
  subscribeToProfile (cb: () => void): () => void {
    return this._echo.identityReady.on(cb);
  }

  //
  // Parties
  //

  /**
   * @deprecated
   * Create a new party.
   * @return {Promise<Party>} The new Party.
   */
  async createParty () {
    return this._echo.createParty();
  }

  /**
   * This is a minimal solution for party restoration functionality.
   * It has limitations and hacks:
   * - We have to treat some models in a special way, this is not a generic solution
   * - We have to recreate relationship between old IDs in newly created IDs
   * - This won't work when identities are required, e.g. in chess.
   * This solution is appropriate only for short term, expected to work only in Teamwork
   */
  async createPartyFromSnapshot (snapshot: DatabaseSnapshot) {
    const party = await this._echo.createParty();
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
        for (const mutation of (item.model.array.mutations || [])) {
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
        throw new Error(`Unhandled model type: ${item.modelType}`);
      }
    }

    return party;
  }

  /**
   * @param partyKey Party publicKey
   * @param secretProvider
   * @param options
   */
  async createInvitation (partyKey: PublicKey, secretProvider: SecretProvider, options?: InvitationOptions) {
    const party = await this.echo.getParty(partyKey) ?? raise(new Error(`Party not found: ${partyKey.toString()}`));
    return party.createInvitation({
      // TODO(marik-d): Probably an error here.
      secretValidator: async (invitation, secret) => secret && secret.equals((invitation as any).secret),
      secretProvider
    },
    options);
  }

  /**
   * @param {Buffer} partyKey Party publicKey
   * @param {Buffer} recipientKey Recipient publicKey
   */
  // TODO(burdon): Move to party.
  async createOfflineInvitation (partyKey: PublicKey, recipientKey: PublicKey) {
    const party = await this.echo.getParty(partyKey) ?? raise(new Error(`Party not found: ${humanize(partyKey.toString())}`));
    return party.createOfflineInvitation(recipientKey);
  }

  // TODO(rzadp): Uncomment after updating ECHO.
  // async createHaloInvitation (secretProvider: SecretProvider, options?: InvitationOptions) {
  //   return this.echo.createHaloInvitation(
  //     {
  //       secretProvider,
  //       secretValidator: (invitation: any, secret: any) => secret && secret.equals(invitation.secret)
  //     }
  //     , options
  //   );
  // }

  //
  // Contacts
  //

  /**
   * Returns an Array of all known Contacts across all Parties.
   * @returns {Contact[]}
   */
  // TODO(burdon): Not implemented.
  async getContacts () {
    console.warn('client.getContacts not impl. Returning []');
    // return this._partyManager.getContacts();
    return [];
  }

  //
  // ECHO
  //

  /**
   * Registers a new model.
   */
  // TODO(burdon): Expose echo directly?
  registerModel (constructor: ModelConstructor<any>): this {
    this._echo.modelFactory.registerModel(constructor);
    return this;
  }

  //
  // Deprecated
  // TODO(burdon): Separate wrapper for devtools?
  //

  /**
   * Returns devtools context
   */
  getDevtoolsContext (): DevtoolsContext {
    const devtoolsContext: DevtoolsContext = {
      client: this,
      feedStore: this._echo.feedStore,
      networkManager: this._echo.networkManager,
      modelFactory: this._echo.modelFactory,
      keyring: this._echo.keyring,
      debug
    };
    return devtoolsContext;
  }

  /**
   * @deprecated Use echo.keyring
   */
  get keyring (): Keyring {
    return this._echo.keyring;
  }

  /**
   * @deprecated Use echo.feedStore
   */
  get feedStore (): FeedStore {
    return this._echo.feedStore;
  }

  /**
   * @deprecated Use echo.networkManager.
   */
  get networkManager (): NetworkManager {
    return this._echo.networkManager;
  }

  /**
   * @deprecated
   */
  get modelFactory () {
    console.warn('client.modelFactory is deprecated.');
    return this._echo.modelFactory;
  }
}

// TODO(burdon): Shouldn't be here.
const DEFAULT_SWARM_CONFIG: ClientConfig['swarm'] = {
  signal: 'ws://localhost:4000',
  ice: [{ urls: 'stun:stun.wireline.ninja:3478' }]
};

function createStorageObjects (config: ClientConfig['storage'], snapshotsEnabled: boolean) {
  const {
    path = 'dxos/storage',
    type,
    keyStorage,
    persistent = false
  } = config ?? {};

  if (persistent && type === 'ram') {
    throw new Error('RAM storage cannot be used in persistent mode.');
  }
  if (!persistent && (type !== undefined && type !== 'ram')) {
    throw new Error('Cannot use a persistent storage in not persistent mode.');
  }
  if (persistent && keyStorage === 'ram') {
    throw new Error('RAM key storage cannot be used in persistent mode.');
  }
  if (!persistent && (keyStorage !== 'ram' && keyStorage !== undefined)) {
    throw new Error('Cannot use a persistent key storage in not persistent mode.');
  }

  return {
    feedStorage: createStorage(`${path}/feeds`, persistent ? type : 'ram'),
    keyStorage: createKeyStorage(`${path}/keystore`, persistent ? keyStorage : 'ram'),
    snapshotStorage: createStorage(`${path}/snapshots`, persistent && snapshotsEnabled ? type : 'ram')
  };
}

function createKeyStorage (path: string, type?: KeyStorageType) {
  const defaultedType = type ?? (isNode() ? 'jsondown' : 'leveljs');

  switch (defaultedType) {
    case 'leveljs': return leveljs(path);
    case 'jsondown': return jsondown(path);
    case 'ram': return memdown();
    default: throw new Error(`Invalid type: ${defaultedType}`);
  }
}
