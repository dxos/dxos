//
// Copyright 2020 DXOS.org
//

import { SignalApi } from './signal-api';
import { PublicKey } from '@dxos/crypto';

/**
 * Adds offer/answer RPC and reliable messaging.
 * 
 * TODO(mykola): https://github.com/dxos/protocols/issues/1316
 */
export class ReliableMessager {
  private readonly _offers: Map<PublicKey, Offer> = new Map();

  constructor (
    private readonly _sendMessage: (message: SignalApi.SignalMessage) => Promise<void>,
    private readonly _onSignal: (message: SignalApi.SignalMessage) => Promise<void>
  ) {}

  async reciveMessage (payload: SignalApi.SignalMessage): Promise<void> {
    this._resolveAnswers(payload);
    return this._onSignal(payload);
  }
  
  async signal (payload: SignalApi.SignalMessage): Promise<void> {
    return this._sendMessage(payload);
  }

  async offer (payload: SignalApi.SignalMessage): Promise<SignalApi.Answer>{
    await this.signal(payload);
    return new Promise<SignalApi.Answer>((resolve, reject) => {
      this._offers.set(payload.sessionId, {resolve, reject});
    });
  }

  private _resolveAnswers (payload: SignalApi.SignalMessage): void {
    const offer = this._offers.get(payload.sessionId);
    if (offer) {
      this._offers.delete(payload.sessionId);
      if (payload.data.error) {
        offer.reject(payload.data.error);
      } else {
        offer.resolve(payload.data.answer);
      }
    }
  }
}

interface Offer {
  resolve: (answer: SignalApi.Answer) => void;
  reject: (error?: Error) => void;
}
