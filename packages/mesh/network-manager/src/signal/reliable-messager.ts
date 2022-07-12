//
// Copyright 2020 DXOS.org
//

import { SignalApi } from './signal-api';

/**
 * Adds offer/answer RPC and reliable messaging.
 * 
 * TODO(mykola): https://github.com/dxos/protocols/issues/1316
 */
export class ReliableMessager {
  constructor (
    private readonly _sendMessage: (message: SignalApi.SignalMessage) => Promise<void>,
    private readonly _onSignal: (message: SignalApi.SignalMessage) => Promise<void>,

  ) {
  }

  async reciveMessage (payload: SignalApi.SignalMessage): Promise<void> {
    return this._onSignal(payload);
  }
  
  async signal (payload: SignalApi.SignalMessage): Promise<void> {
    return this._sendMessage(payload);
  }

  async offer (payload: SignalApi.SignalMessage): Promise<SignalApi.Answer>{}
  
}
