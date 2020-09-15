//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { Event } from '@dxos/async';
import { Party as PartyStateMachine, KeyType } from '@dxos/credentials';
import { keyToString, keyToBuffer } from '@dxos/crypto';
import { PartyKey, IHaloStream, FeedKey, Spacetime, FeedKeyMapper, MessageSelector, FeedBlock } from '@dxos/experimental-echo-protocol';
import { jsonReplacer } from '@dxos/experimental-util';

const log = debug('dxos:echo:halo-party-processor');

const spacetime = new Spacetime(new FeedKeyMapper('feedKey'));

export interface FeedSetProvider {
  get(): FeedKey[]
  added: Event<FeedKey>
}

/**
 * Party processor for testing.
 */
export class PartyProcessor {
  protected readonly _partyKey: PartyKey;

  protected readonly _feedAdded = new Event<FeedKey>()

  // Current timeframe.
  private _timeframe = spacetime.createTimeframe();

  private readonly _stateMachine: PartyStateMachine;

  constructor (partyKey: PartyKey) {
    this._partyKey = partyKey;
    this._stateMachine = new PartyStateMachine(partyKey);

    // TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
    // is not exported, and the PartyStateMachine being used is not properly understood as an EventEmitter by TS.
    // Casting to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
    const state = this._stateMachine as any;

    state.on('admit:feed', (keyRecord: any) => {
      log(`Feed key admitted ${keyToString(keyRecord.publicKey)}`);
      this._feedAdded.emit(keyRecord.publicKey);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    state.on('admit:key', (keyRecord: any) => {
      // this._keyAdded.emit(keyRecord.publicKey);
    });
  }

  get partyKey () {
    return this._partyKey;
  }

  get timeframe () {
    return this._timeframe;
  }

  get feedKeys () {
    return this._stateMachine.memberFeeds;
  }

  get memberKeys () {
    return this._stateMachine.memberKeys;
  }

  // TODO(burdon): Factor out from feed-store-iterator test.
  get messageSelector (): MessageSelector {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (candidates: FeedBlock[]) => 0;
  }

  getActiveFeedSet (): FeedSetProvider {
    return {
      get: () => this.feedKeys,
      added: this._feedAdded
    };
  }

  async addHints (feedKeys: FeedKey[]) {
    log(`addHints ${feedKeys.map(key => keyToString(key))}`);
    // Gives state machine hints on initial feed set from where to read party genesis message.
    await this._stateMachine.takeHints(feedKeys.map(publicKey => ({ publicKey, type: KeyType.FEED })));
  }

  updateTimeframe (key: FeedKey, seq: number) {
    this._timeframe = spacetime.merge(this._timeframe, spacetime.createTimeframe([[key as any, seq]]));
  }

  async processMessage (message: IHaloStream): Promise<void> {
    log(`Processing: ${JSON.stringify(message, jsonReplacer)}`);
    const { data } = message;
    return this._stateMachine.processMessages([data]);
  }
}
