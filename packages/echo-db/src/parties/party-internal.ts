//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { createPartyInvitationMessage } from '@dxos/credentials';
import { DatabaseSnapshot, PartyKey, PartySnapshot, PublicKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { timed } from '@dxos/util';

import {
  GreetingResponder, InvitationDescriptor, InvitationDescriptorType, InvitationAuthenticator, InvitationOptions
} from '../invitations';
import { ItemDemuxer, Item, ItemManager } from '../items';
import { TimeframeClock } from '../items/timeframe-clock';
import { ReplicationAdapter } from '../replication';
import { IdentityManager } from './identity-manager';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

// TODO(burdon): Format?
export const PARTY_ITEM_TYPE = 'wrn://dxos.org/item/party';
export const HALO_PARTY_DESCRIPTOR_TYPE = 'wrn://dxos.org/item/halo/party-descriptor';
export const HALO_CONTACT_LIST_TYPE = 'wrn://dxos.org/item/halo/contact-list';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class PartyInternal {
  private _itemManager: ItemManager | undefined;
  private _itemDemuxer: ItemDemuxer | undefined;
  private _inboundEchoStream: NodeJS.WritableStream | undefined;

  /**
   * Snapshot to be restored from when party.open() is called.
   */
  private _databaseSnapshot: DatabaseSnapshot | undefined;

  private _subscriptions: (() => void)[] = [];

  /**
   * The Party is constructed by the `Database` object.
   */
  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _partyProcessor: PartyProcessor,
    private readonly _pipeline: Pipeline,
    private readonly _identityManager: IdentityManager,
    private readonly _networkManager: NetworkManager,
    private readonly _replicator: ReplicationAdapter,
    private readonly _timeframeClock: TimeframeClock
  ) {
    assert(this._modelFactory);
    assert(this._partyProcessor);
    assert(this._pipeline);
  }

  get key (): PartyKey {
    return this._pipeline.partyKey;
  }

  get isOpen (): boolean {
    return !!this._itemManager;
  }

  get itemManager () {
    return this._itemManager;
  }

  get itemDemuxer () {
    return this._itemDemuxer;
  }

  get processor () {
    return this._partyProcessor;
  }

  get pipeline () {
    return this._pipeline;
  }

  /**
   * Opens the pipeline and connects the streams.
   */
  @synchronized
  @timed(5000)
  async open () {
    if (this._itemManager) {
      return this;
    }

    // TODO(burdon): Support read-only parties.
    const [readStream, writeStream] = await this._pipeline.open();

    // Connect to the downstream item demuxer.
    this._itemManager = new ItemManager(this.key, this._modelFactory, this._timeframeClock, writeStream);
    this._itemDemuxer = new ItemDemuxer(this._itemManager, { snapshots: true });

    this._inboundEchoStream = this._itemDemuxer.open();
    readStream.pipe(this._inboundEchoStream);

    if (this._pipeline.outboundHaloStream) {
      this._partyProcessor.setOutboundStream(this._pipeline.outboundHaloStream);
    }

    // Replication.
    await this._replicator.start();

    // TODO(burdon): Propagate errors.
    this._subscriptions.push(this._pipeline.errors.on(err => console.error(err)));

    if (this._databaseSnapshot) {
      await this.itemDemuxer!.restoreFromSnapshot(this._databaseSnapshot);
    }

    return this;
  }

  /**
   * Closes the pipeline and streams.
   */
  @synchronized
  async close () {
    if (!this._itemManager) {
      return this;
    }

    await this._replicator.stop();

    // Disconnect the read stream.
    this._pipeline.inboundEchoStream?.unpipe(this._inboundEchoStream);

    this._itemManager = undefined;
    this._itemDemuxer = undefined;

    // TODO(burdon): Create test to ensure everything closes cleanly.
    await this._pipeline.close();

    this._subscriptions.forEach(cb => cb());

    return this;
  }

  async createOfflineInvitation (publicKey: PublicKey) {
    assert(!this.isHalo, 'Offline invitations to HALO are not allowed.');
    assert(this._identityManager.identityKey, 'Identity key is required.');
    assert(this._identityManager.deviceKeyChain, 'Device keychain is required.');
    assert(this._pipeline.outboundHaloStream);

    const invitationMessage = createPartyInvitationMessage(
      this._identityManager.keyring,
      this.key,
      publicKey,
      this._identityManager.identityKey,
      this._identityManager.deviceKeyChain
    );
    this._pipeline.outboundHaloStream.write(invitationMessage);

    return new InvitationDescriptor(
      InvitationDescriptorType.OFFLINE_KEY,
      this.key,
      invitationMessage.payload.signed.payload.id
    );
  }

  /**
   * Creates an invitation for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    assert(this._networkManager);

    const responder = new GreetingResponder(
      this._identityManager,
      this._networkManager,
      this._partyProcessor
    );

    const { secretValidator, secretProvider } = authenticationDetails;
    const { onFinish, expiration } = options;

    const swarmKey = await responder.start();
    const invitation = await responder.invite(secretValidator, secretProvider, onFinish, expiration);

    return new InvitationDescriptor(
      InvitationDescriptorType.INTERACTIVE,
      swarmKey,
      invitation,
      this.isHalo ? Buffer.from(this.key) : undefined
    );
  }

  /**
   * Returns a special Item that is used by the Party to manage its properties.
   */
  getPropertiestItem (): Item<ObjectModel> {
    assert(this._itemManager);
    const { value: items } = this._itemManager.queryItems({ type: PARTY_ITEM_TYPE });
    assert(items.length === 1);
    return items[0];
  }

  get isHalo () {
    // The PartyKey of the HALO is the Identity key.
    assert(this._identityManager.identityKey, 'No identity key');
    return this._identityManager.identityKey.publicKey.equals(this.key);
  }

  /**
   * Create a snapshot of the current state.
   */
  createSnapshot (): PartySnapshot {
    assert(this._itemDemuxer, 'Party not open.');
    return {
      partyKey: this.key,
      timeframe: this._timeframeClock.timeframe,
      timestamp: Date.now(),
      database: this._itemDemuxer.createSnapshot(),
      halo: this._partyProcessor.makeSnapshot()
    };
  }

  async restoreFromSnapshot (snapshot: PartySnapshot) {
    assert(snapshot.halo);
    assert(snapshot.database);

    await this.processor.restoreFromSnapshot(snapshot.halo);

    this._databaseSnapshot = snapshot.database;
  }
}
