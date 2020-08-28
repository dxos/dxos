// TODO(marik-d): Move this file to gravity
/* eslint-disable */
// @ts-nocheck

import { keyToBuffer, keyToString, randomBytes } from '@dxos/crypto';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { FeedStore } from '@dxos/feed-store';
import { NetworkManager } from '@dxos/network-manager';
import { Agent, Environment, JsonObject } from '@dxos/node-spawner';

import { codec } from './codec';
import { Database } from './database';
import { Inviter } from './invitation';
import { Party, PartyManager } from './parties';
import { createReplicatorFactory } from './replication';

export default class TestAgent implements Agent {
  private party?: Party;
  private db!: Database;
  private inviter?: Inviter;

  constructor (private environment: Environment) {}

  async init (): Promise<void> {
    const { storage, swarmProvider } = this.environment;

    const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });

    const networkManager = new NetworkManager(feedStore, swarmProvider);

    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel.meta, ObjectModel);

    const partyManager = new PartyManager(
      feedStore,
      modelFactory,
      createReplicatorFactory(networkManager, feedStore, randomBytes())
    );
    this.db = new Database(partyManager);
    await this.db.open();
  }

  async onEvent (event: JsonObject) {
    if (event.command === 'CREATE_PARTY') {
      this.party = await this.db.createParty();

      const items = await this.party.queryItems();
      items.subscribe(items => {
        this.environment.metrics.set('itemCount', items.length);
      });

      this.inviter = this.party.createInvitation();
      this.environment.log('invitation', {
        partyKey: keyToString(this.inviter.invitation.partyKey as any),
        feeds: this.inviter.invitation.feeds.map(keyToString)
      });
    } else if (event.command === 'ACCEPT_INVITATION') {
      const { response, party } = await this.db.joinParty({
        partyKey: keyToBuffer((event.invitation as any).partyKey),
        feeds: (event.invitation as any).feeds.map(keyToBuffer)
      });
      this.party = party;
      const items = await this.party.queryItems();
      items.subscribe(items => {
        this.environment.metrics.set('itemCount', items.length);
      });

      this.environment.log('invitationResponse', { newFeedKey: keyToString(response.newFeedKey) });
    } else if (event.command === 'FINALIZE_INVITATION') {
      this.inviter?.finalize({
        newFeedKey: keyToBuffer((event.invitationResponse as any).newFeedKey)
      });
    } else {
      this.party!.createItem('wrn://dxos.org/item/document');
    }
  }

  async snapshot () {
    const items = await this.party?.queryItems();
    return {
      items: items?.value.map(item => ({
        id: item.id,
        type: item.type
        // model: JSON.parse(JSON.stringify(item.model)), // TODO(marik-d): Use a generic way to serialize items
      }))
    };
  }

  async destroy (): Promise<void> { }
}
