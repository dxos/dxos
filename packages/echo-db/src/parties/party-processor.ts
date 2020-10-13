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
  Party as PartyStateMachine,
  PartyAuthenticator
} from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import { FeedKey, FeedWriter, HaloMessage, IHaloStream, PartyKey, PublicKey, WriteReceipt } from '@dxos/echo-protocol';
import { jsonReplacer } from '@dxos/util';

const log = debug('dxos:echo:halo-party-processor');

export interface FeedSetProvider {
  get(): FeedKey[]
  added: Event<FeedKey>
}

/**
 * Party processor for testing.
 */
export class PartyProcessor {
  protected readonly _feedAdded = new Event<FeedKey>()

  private readonly _stateMachine: PartyStateMachine;
  private readonly _authenticator: Authenticator;

  public readonly keyAdded: Event<KeyRecord>;

  private _outboundHaloStream: FeedWriter<HaloMessage> | undefined;

  constructor (
    private readonly _partyKey: PartyKey
  ) {
    this._stateMachine = new PartyStateMachine(this._partyKey);
    this._authenticator = new PartyAuthenticator(this._stateMachine);

    // TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
    // is not exported, and the PartyStateMachine being used is not properly understood as an EventEmitter by TS.
    // Casting to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
    const state = this._stateMachine as any;

    // TODO(marik-d): Use Event.wrap here.
    state.on('admit:feed', (keyRecord: any) => {
      log(`Feed key admitted ${keyToString(keyRecord.publicKey)}`);
      this._feedAdded.emit(keyRecord.publicKey);
    });

    this.keyAdded = Event.wrap(state, 'admit:key');
  }

  get partyKey () {
    return this._partyKey;
  }

  get feedKeys () {
    return this._stateMachine.memberFeeds;
  }

  get memberKeys () {
    return this._stateMachine.memberKeys;
  }

  get credentialMessages () {
    return this._stateMachine.credentialMessages;
  }

  get infoMessages () {
    return this._stateMachine.infoMessages;
  }

  get genesisRequired () {
    return this._stateMachine.credentialMessages.size === 0;
  }

  get authenticator () {
    return this._authenticator;
  }

  isFeedAdmitted (feedKey: FeedKey) {
    return this._stateMachine.credentialMessages.has(keyToString(feedKey));
  }

  getMemberInfo (publicKey: PublicKey) {
    // TODO(telackey): Normalize PublicKey types in @dxos/credentials.
    return this._stateMachine.getInfo(Buffer.from(publicKey));
  }

  /**
   * Returns public key of the member that admitted the specified feed.
   */
  getFeedOwningMember (feedKey: FeedKey): PublicKey {
    // TODO(marik-d): Commented out beacuse it breaks tests currently.
    // assert(this._stateMachine.isMemberFeed(feedKey), 'Not a member feed');
    return this._stateMachine.getAdmittedBy(feedKey);
  }

  // TODO(burdon): Rename xxxProvider.
  getActiveFeedSet (): FeedSetProvider {
    return {
      get: () => this.feedKeys,
      added: this._feedAdded
    };
  }

  async takeHints (hints: KeyHint[]) {
    log(`addHints ${hints.length}`);
    // Gives state machine hints on initial feed set from where to read party genesis message.
    // TODO(telackey): Hints were not intended to provide a feed set for PartyGenesis messages. They are about
    // what feeds and keys to trust immediately after Greeting, before we have had the opportunity to replicate the
    // credential messages for ourselves.
    await this._stateMachine.takeHints(hints);
  }

  async processMessage (message: IHaloStream): Promise<void> {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    const { data } = message;
    return this._stateMachine.processMessages([data]);
  }

  setOutboundStream (stream: FeedWriter<HaloMessage>) {
    this._outboundHaloStream = stream;
  }

  async writeHaloMessage (message: HaloMessage): Promise<WriteReceipt> {
    assert(this._outboundHaloStream, 'Party is closed or read-only');
    // TODO(marik-d): Wait for the message to be processed?
    return this._outboundHaloStream.write(message);
  }
}
