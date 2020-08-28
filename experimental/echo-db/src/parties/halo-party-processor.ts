//
// Copyright 2020 DXOS.org
//

import { Party as PartyStateMachine } from '@dxos/credentials';
import { PartyKey, IHaloStream, FeedKey } from '@dxos/experimental-echo-protocol';

import { PartyProcessor } from './party-processor';

/**
 * Party processor for testing.
 */
export class HaloPartyProcessor extends PartyProcessor {
  private readonly _stateMachine: PartyStateMachine;

  constructor (partyKey: PartyKey) {
    super(partyKey);

    this._stateMachine = new PartyStateMachine(partyKey);
    this._forwardEvents();
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

  protected _addFeedKey (key: FeedKey) {
    throw new Error('Unsupported: _addFeedKey');
  }

  private _forwardEvents() {
    // TODO(telackey) @dxos/credentials was only half converted to TS. In its current state, the KeyRecord type
    // is not exported, and the PartyStateMachine being used is not properly understood as an EventEmitter by TS.
    // Casting to 'any' is a workaround for the compiler, but the fix is fully to convert @dxos/credentials to TS.
    const state = this._stateMachine as any;

    state.on('admit:feed', (keyRecord: any) => {
      this._feedAdded.emit(keyRecord.publicKey);
    });

    state.on('admit:key', (keyRecord: any) => {
      // this._keyAdded.emit(keyRecord.publicKey);
    });
  }
}
