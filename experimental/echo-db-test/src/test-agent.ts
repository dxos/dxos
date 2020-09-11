//
// Copyright 2020 DXOS.org
//

import { keyToBuffer, keyToString, randomBytes } from '@dxos/crypto';
import {
  codec, Database, Invitation, Party, PartyManager, createReplicatorFactory, FeedStoreAdapter, PartyFactory
} from '@dxos/experimental-echo-db';
import { ModelFactory } from '@dxos/experimental-model-factory';
import { ObjectModel } from '@dxos/experimental-object-model';
import { FeedStore } from '@dxos/feed-store';
import { NetworkManager } from '@dxos/network-manager';
import { Agent, Environment, JsonObject } from '@dxos/node-spawner';

export default class TestAgent implements Agent {
  private party?: Party;
  private db!: Database;
  private invitation?: Invitation;

  constructor (private environment: Environment) {}

  async init (): Promise<void> {
    const { storage, swarmProvider } = this.environment;

    const feedStore = new FeedStore(storage, { feedOptions: { valueEncoding: codec } });
    const feedStoreAdapter = new FeedStoreAdapter(feedStore);

    const networkManager = new NetworkManager(feedStore, swarmProvider);

    const modelFactory = new ModelFactory()
      .registerModel(ObjectModel.meta, ObjectModel);

    const partyFactory = new PartyFactory(
      feedStoreAdapter,
      modelFactory,
      createReplicatorFactory(networkManager, feedStore, randomBytes())
    );
    await partyFactory.initIdentity();
    const partyManager = new PartyManager(feedStoreAdapter, partyFactory);
    this.db = new Database(partyManager);
    await this.db.open();
  }

  async onEvent (event: JsonObject) {
    // TODO(burdon): Switch command (not if).
    if (event.command === 'CREATE_PARTY') {
      this.party = await this.db.createParty();

      const items = await this.party.queryItems();
      this.environment.metrics.set('item.count', items.value.length);
      items.subscribe(items => {
        this.environment.metrics.set('item.count', items.length);
      });

      this.invitation = this.party.createInvitation();
      this.environment.log('invitation', {
        partyKey: keyToString(this.invitation.request.partyKey as any),
        feeds: this.invitation.request.feeds.map(key => keyToString(key))
      });
    } else if (event.command === 'ACCEPT_INVITATION') { // TODO(burdon): "invitation.accept", etc.
      const { response, party } = await this.db.joinParty({
        partyKey: keyToBuffer((event.invitation as any).partyKey),
        feeds: (event.invitation as any).feeds.map(keyToBuffer) // TODO(burdon): Don't convert map.
      });
      this.party = party;
      const items = await this.party.queryItems();
      items.subscribe(items => {
        this.environment.metrics.set('item.count', items.length);
      });

      this.environment.log('invitationResponse', {
        peerFeedKey: keyToString(response.peerFeedKey),
        keyAdmitMessage: codec.encode({ halo: response.keyAdmitMessage }).toString('hex'),
        feedAdmitMessage: codec.encode({ halo: response.feedAdmitMessage }).toString('hex')
      });
    } else if (event.command === 'FINALIZE_INVITATION') {
      this.invitation!.finalize({
        peerFeedKey: keyToBuffer((event.invitationResponse as any).peerFeedKey),
        keyAdmitMessage: codec.decode(Buffer.from((event.invitationResponse as any).keyAdmitMessage, 'hex')).halo,
        feedAdmitMessage: codec.decode(Buffer.from((event.invitationResponse as any).feedAdmitMessage, 'hex')).halo
      });
    } else {
      this.party!.createItem(ObjectModel);
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
