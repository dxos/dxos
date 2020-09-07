//
// Copyright 2020 DXOS.org
//

import { Party as PartyStateMachine, KeyType } from '@dxos/credentials';
import { PartyKey, IHaloStream, FeedKey } from '@dxos/experimental-echo-protocol';

import { PartyProcessor } from './party-processor';

/**
 * Party processor for testing.
 */
export class HaloPartyProcessor extends PartyProcessor {
  private readonly _stateMachine: PartyStateMachine;

  constructor (partyKey: PartyKey, private readonly feedKeyHints: FeedKey[]) {
    super(partyKey);

    this._stateMachine = new PartyStateMachine(partyKey);
    this._forwardEvents();
  }

  // TODO(marik-d): After the party manager is decomposed into halo and test variants, make this only a method of halo party processor.
  async init () {
    // Gives state machine hints on initial feed set from where to read party genesis message.
    await this._stateMachine.takeHints(this.feedKeyHints.map(publicKey => ({ publicKey, type: KeyType.FEED })));
  }

  get keyring () {
    return this._stateMachine.keyring;
  }

  async _processMessage (message: IHaloStream): Promise<void> {
    const { data } = message;
    return this._stateMachine.processMessages([data]);
  }

  public get feedKeys () {
    return this._stateMachine.memberFeeds;
  }

  public get memberKeys () {
    return this._stateMachine.memberKeys;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected _addFeedKey (key: FeedKey) {
    throw new Error('Not implemented');
  }

  private _forwardEvents () {
    // TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
    // is not exported, and the PartyStateMachine being used is not properly understood as an EventEmitter by TS.
    // Casting to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
    const state = this._stateMachine as any;

    state.on('admit:feed', (keyRecord: any) => {
      this._feedAdded.emit(keyRecord.publicKey);
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    state.on('admit:key', (keyRecord: any) => {
      // this._keyAdded.emit(keyRecord.publicKey);
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async admitFeed (feedKey: FeedKey) {
    // TODO(marik-d): Remove this method and make the class only do the processing
  }
}
