//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event } from '@dxos/async';
import {
  Authenticator,
  KeyHint,
  KeyRecord,
  PartyState,
  PartyAuthenticator,
  Message as HaloMessage
} from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { FeedKey, FeedWriter, IHaloStream, PartyKey, HaloStateSnapshot, WriteReceipt } from '@dxos/echo-protocol';
import { jsonReplacer } from '@dxos/util';

const log = debug('dxos:echo:parties:party-processor');

export interface FeedSetProvider {
  get(): FeedKey[]
  added: Event<FeedKey>
}

/**
 * Party processor for testing.
 */
export class PartyProcessor {
  private readonly _state: PartyState;
  private readonly _authenticator: Authenticator;

  private _outboundHaloStream: FeedWriter<HaloMessage> | undefined;

  protected readonly _feedAdded = new Event<FeedKey>()

  public readonly keyOrInfoAdded = new Event<PublicKey>();

  /**
   * Used to generate halo snapshot.
   */
  private _haloMessages: HaloMessage[] = [];

  constructor (
    private readonly _partyKey: PartyKey
  ) {
    this._state = new PartyState(this._partyKey);
    this._authenticator = new PartyAuthenticator(this._state);

    // TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
    // is not exported, and the PartyStateMachine being used is not properly understood as an EventEmitter by TS.
    // Casting to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
    const state = this._state as any;

    // TODO(marik-d): Use Event.wrap here.
    state.on('admit:feed', (keyRecord: any) => {
      log(`Feed key admitted ${keyRecord.publicKey.toHex()}`);
      this._feedAdded.emit(keyRecord.publicKey);
    });
    state.on('admit:key', (keyRecord: KeyRecord) => this.keyOrInfoAdded.emit(keyRecord.publicKey));
    state.on('update:identityinfo', (publicKey: PublicKey) => this.keyOrInfoAdded.emit(publicKey));
  }

  get partyKey () {
    return this._partyKey;
  }

  get feedKeys (): PublicKey[] {
    return this._state.memberFeeds;
  }

  get memberKeys (): PublicKey[] {
    return this._state.memberKeys;
  }

  get credentialMessages () {
    return this._state.credentialMessages;
  }

  get infoMessages () {
    return this._state.infoMessages;
  }

  get genesisRequired () {
    return this._state.credentialMessages.size === 0;
  }

  get authenticator () {
    return this._authenticator;
  }

  isFeedAdmitted (feedKey: FeedKey) {
    // TODO(telackey): Make sure it is a feed.
    return this._state.credentialMessages.has(feedKey.toHex());
  }

  isMemberKey (publicKey: PublicKey) {
    // TODO(telackey): Make sure it is not a feed.
    return this._state.credentialMessages.has(publicKey.toHex());
  }

  getMemberInfo (publicKey: PublicKey) {
    // TODO(telackey): Normalize PublicKey types in @dxos/credentials.
    return this._state.getInfo(publicKey);
  }

  /**
   * Returns public key of the member that admitted the specified feed.
   */
  getFeedOwningMember (feedKey: FeedKey): PublicKey | undefined {
    // TODO(marik-d): Commented out beacuse it breaks tests currently.
    // assert(this._stateMachine.isMemberFeed(feedKey), 'Not a member feed');
    return this._state.getAdmittedBy(feedKey);
  }

  // TODO(burdon): Rename xxxProvider.
  getActiveFeedSet (): FeedSetProvider {
    return {
      get: () => this.feedKeys,
      added: this._feedAdded
    };
  }

  getOfflineInvitation (invitationID: Buffer) {
    return this._state.getInvitation(invitationID);
  }

  async takeHints (hints: KeyHint[]) {
    log(`addHints ${hints.length}`);
    // Gives state machine hints on initial feed set from where to read party genesis message.
    // TODO(telackey): Hints were not intended to provide a feed set for PartyGenesis messages. They are about
    // what feeds and keys to trust immediately after Greeting, before we have had the opportunity to replicate the
    // credential messages for ourselves.
    await this._state.takeHints(hints);
  }

  async processMessage (message: IHaloStream) {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    const { data } = message;
    this._haloMessages.push(data);
    await this._state.processMessages([data]);
  }

  setOutboundStream (stream: FeedWriter<HaloMessage>) {
    this._outboundHaloStream = stream;
  }

  async writeHaloMessage (message: HaloMessage): Promise<WriteReceipt> {
    assert(this._outboundHaloStream, 'Party is closed or read-only');
    // TODO(marik-d): Wait for the message to be processed?
    return this._outboundHaloStream.write(message);
  }

  makeSnapshot (): HaloStateSnapshot {
    return {
      messages: this._haloMessages
    };
  }

  async restoreFromSnapshot (snapshot: HaloStateSnapshot) {
    assert(this._haloMessages.length === 0, 'PartyProcessor is already initialized');
    assert(snapshot.messages);
    this._haloMessages = snapshot.messages;
    await this._state.processMessages(snapshot.messages);
  }
}
