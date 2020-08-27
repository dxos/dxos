//
// Copyright 2020 DXOS.org
//

import { Party as PartyStateMachine } from '@dxos/credentials';
import { PartyKey, IHaloStream } from '@dxos/experimental-echo-protocol';

import { PartyProcessor } from './party-processor';

/**
 * Party processor for testing.
 */
export class HaloPartyProcessor extends PartyProcessor {
  private readonly _stateMachine: PartyStateMachine;

  constructor (partyKey: PartyKey) {
    super(partyKey);

    this._stateMachine = new PartyStateMachine(partyKey);
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
}
