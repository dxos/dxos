//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Keyring, KeyType } from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import {
  codec, ECHO, FeedStoreAdapter, InvitationDescriptor, Party, PartyFactory, PartyManager, IdentityManager
} from '@dxos/echo-db';
import { FeedStore } from '@dxos/feed-store';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { Agent, Environment, JsonObject } from '@dxos/node-spawner';
import { ObjectModel } from '@dxos/object-model';

export enum Command {
  CREATE_PARTY = 'CREATE_PARTY',
  CREATE_INVITATION = 'CREATE_INVITATION',
  JOIN_PARTY = 'JOIN_PARTY',
  CREATE_ITEM = 'CREATE_ITEM',
}

export default class TestAgent implements Agent {
  private party?: Party;
  private echo!: ECHO;

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
      .registerModel(ObjectModel);

    const partyFactory = new PartyFactory(
      identityManager,
      feedStoreAdapter,
      modelFactory,
      networkManager
    );
    const partyManager = new PartyManager(identityManager, feedStoreAdapter, partyFactory);
    await partyManager.open();
    await partyManager.createHalo();

    this.echo = new ECHO(partyManager);
    await this.echo.open();
  }

  async onEvent (event: JsonObject) {
    this.environment.logMessage('onEvent', JSON.stringify(event));

    switch (event.command) {
      case Command.CREATE_PARTY: {
        this.party = await this.echo.createParty();

        const items = await this.party.database.queryItems();
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
        this.party = await this.echo.joinParty(invitation, async () => Buffer.from('0000'));
        const items = await this.party.database.queryItems();
        items.subscribe(items => {
          this.environment.metrics.set('item.count', items.length);
        });
        this.environment.log('joinParty', {
          partyKey: keyToString(this.party.key)
        });
      } break;
      case Command.CREATE_ITEM:
        assert(this.party);
        this.party.database.createItem(ObjectModel);
        break;
      default: {
        throw new Error('Invalid command');
      }
    }
  }

  async snapshot () {
    const items = await this.party?.database.queryItems();
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
