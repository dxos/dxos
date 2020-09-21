//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType } from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import {
  codec, Database, FeedStoreAdapter, InvitationDescriptor, Party, PartyFactory, PartyManager, IdentityManager
} from '@dxos/experimental-echo-db';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { FeedStore } from '@dxos/feed-store';
import { NetworkManager } from '@dxos/network-manager';
import { Agent, Environment, JsonObject } from '@dxos/node-spawner';

export enum Command {
  CREATE_PARTY = 'CREATE_PARTY',
  CREATE_INVITATION = 'CREATE_INVITATION',
  JOIN_PARTY = 'JOIN_PARTY',
  CREATE_ITEM = 'CREATE_ITEM',
}

export default class TestAgent implements Agent {
  private party?: Party;
  private db!: Database;

  constructor (private environment: Environment) {}

  async init (): Promise<void> {
    const { storage, swarmProvider } = this.environment;

    const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    let identityManager;
    {
      const keyring = new Keyring();
      await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      identityManager = new IdentityManager(keyring);
    }

    const networkManager = new NetworkManager(feedStore, swarmProvider);

    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel.meta, ObjectModel);

    const partyFactory = new PartyFactory(
      identityManager.keyring,
      feedStoreAdapter,
      modelFactory,
      networkManager
    );
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);
    await partyManager.open();
    await partyManager.createHalo();

    this.db = new Database(partyManager);
    await this.db.open();
  }

  async onEvent (event: JsonObject) {
    this.environment.logMessage('onEvent', JSON.stringify(event));

    switch (event.command) {
      case Command.CREATE_PARTY: {
        this.party = await this.db.createParty();

        const items = await this.party.queryItems();
        this.environment.metrics.set('item.count', items.value.length);
        items.subscribe(items => {
          this.environment.metrics.set('item.count', items.length);
        });
        this.environment.log('party', {
          partyKey: keyToString(this.party.key)
        });
      } break;
      case Command.CREATE_INVITATION: {
        assert(this.party);
        const invitation = await this.party.createInvitation({
          secretProvider: async () => Buffer.from('0000'),
          secretValidator: async () => true
        });
        this.environment.log('invitation', {
          invitation: invitation.toQueryParameters() as any
        });
      } break;
      case Command.JOIN_PARTY: {
        const invitation = InvitationDescriptor.fromQueryParameters(event.invitation as any);
        this.party = await this.db.joinParty(invitation, async () => Buffer.from('0000'));
        const items = await this.party.queryItems();
        items.subscribe(items => {
          this.environment.metrics.set('item.count', items.length);
        });
        this.environment.log('joinParty', {
          partyKey: keyToString(this.party.key)
        });
      } break;
      case Command.CREATE_ITEM:
        this.party!.createItem(ObjectModel);
        break;
      default: {
        throw new Error('Invalid command');
      }
    }
  }

  async snapshot () {
    const items = await this.party?.queryItems();
    return {
      items: items?.value.map(item => ({
        id: item.id,
        type: item.type,
        model: item.model._meta.type
        // model: JSON.parse(JSON.stringify(item.model)), // TODO(marik-d): Use a generic way to serialize items.
      }))
    };
  }

  async destroy (): Promise<void> { }
}
