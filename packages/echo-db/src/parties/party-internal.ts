//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { synchronized } from '@dxos/async';
import { KeyRecord, Keyring } from '@dxos/credentials';
import { PartyKey } from '@dxos/echo-protocol';
import { ModelFactory } from '@dxos/model-factory';
import { NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';

import {
  GreetingResponder, InvitationDescriptor, InvitationDescriptorType, InvitationAuthenticator, InvitationOptions
} from '../invitations';
import { createItemDemuxer, Item, ItemManager } from '../items';
import { TimeframeClock } from '../items/timeframe-clock';
import { ReplicationAdapter } from '../replication';
import { PartyProcessor } from './party-processor';
import { Pipeline } from './pipeline';

// TODO(burdon): Format?
export const PARTY_ITEM_TYPE = 'wrn://dxos.org/item/party';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PartyFilter {}

/**
 * A Party represents a shared dataset containing queryable Items that are constructed from an ordered stream
 * of mutations.
 */
export class PartyInternal {
  private _itemManager: ItemManager | undefined;
  private _itemDemuxer: NodeJS.WritableStream | undefined;
  private _unsubscribePipelineErrors: (() => void) | undefined;

  /**
   * The Party is constructed by the `Database` object.
   */
  constructor (
    private readonly _modelFactory: ModelFactory,
    private readonly _partyProcessor: PartyProcessor,
    private readonly _pipeline: Pipeline,
    private readonly _keyring: Keyring,
    private readonly _identityKeypair: KeyRecord,
    private readonly _networkManager: NetworkManager,
    private readonly _replicator: ReplicationAdapter,
    private readonly _timeframeClock: TimeframeClock
  ) {
    assert(this._modelFactory);
    assert(this._partyProcessor);
    assert(this._pipeline);
    assert(this._keyring);
    assert(this._identityKeypair);
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
  async open () {
    if (this._itemManager) {
      return this;
    }

    // TODO(burdon): Support read-only parties.
    const [readStream, writeStream] = await this._pipeline.open();

    // Connect to the downstream item demuxer.
    this._itemManager = new ItemManager(this.key, this._modelFactory, this._timeframeClock, writeStream);
    this._itemDemuxer = createItemDemuxer(this._itemManager);
    readStream.pipe(this._itemDemuxer);

    if (this._pipeline.outboundHaloStream) {
      this._partyProcessor.setOutboundStream(this._pipeline.outboundHaloStream);
    }

    // Replication.
    this._replicator.start();

    // TODO(burdon): Propagate errors.
    this._unsubscribePipelineErrors = this._pipeline.errors.on(err => console.error(err));

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

    this._replicator.stop();

    // Disconnect the read stream.
    this._pipeline.inboundEchoStream?.unpipe(this._itemDemuxer);

    this._itemManager = undefined;
    this._itemDemuxer = undefined;

    // TODO(burdon): Create test to ensure everything closes cleanly.
    await this._pipeline.close();

    this._unsubscribePipelineErrors!();

    return this;
  }

  /**
   * Creates an invition for a remote peer.
   */
  async createInvitation (authenticationDetails: InvitationAuthenticator, options: InvitationOptions = {}) {
    assert(this._pipeline.outboundHaloStream);
    assert(this._networkManager);

    const responder = new GreetingResponder(
      this._keyring,
      this._networkManager,
      this._partyProcessor,
      this._identityKeypair, // TODO(burdon): Move to keyring?
      this.key
    );

    const { secretValidator, secretProvider } = authenticationDetails;
    const { onFinish, expiration } = options;

    const swarmKey = await responder.start();
    const invitation = await responder.invite(secretValidator, secretProvider, onFinish, expiration);

    return new InvitationDescriptor(InvitationDescriptorType.INTERACTIVE, swarmKey, invitation);
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
}
