import { PublicKey } from "@dxos/crypto";
import { SignalApi } from "../signal";
import { Transport, TransportFactory } from "../transport/transport";
import assert from 'assert'

export enum ConnectionState {
  INITIAL = 'INITIAL',
  OFFERING = 'OFFERING',
  CONNECTING = 'CONNECTING',
}

export class Connection {
  
  private _sessionId: PublicKey | undefined;

  private _state: ConnectionState = ConnectionState.INITIAL;

  private _initiator: boolean;

  private _transport: Transport | undefined;

  constructor(
    public readonly topic: PublicKey,
    public readonly ownId: PublicKey,
    public readonly remoteId: PublicKey,
    private readonly _transportFactory: TransportFactory,
    private readonly _sendOffer: (message: SignalApi.OfferMessage) => Promise<SignalApi.Answer>,
    private readonly _sendSignal: (message: SignalApi.SignalMessage) => Promise<void>,
  ) {
    this._initiator = this.ownId.toHex() > this.remoteId.toHex();
  }

  get sessionId() {
    return this._sessionId;
  }

  async makeOffer() {
    assert(this._state === ConnectionState.INITIAL, 'Invalid connection state.');

    this._state = ConnectionState.OFFERING;

    if(this._initiator) {
      this._sessionId = PublicKey.random();
    }

    const answer = await this._sendOffer({
      id: this.ownId,
      remoteId: this.remoteId,
      sessionId: this._sessionId,
      topic: this.topic,
      data: {}
    });
    if(this._state != ConnectionState.OFFERING) {
      return;
    }
    if(this.ans)

    if(answer.accept) {
      this._transport = this._transportFactory({
        initiator: this._initiator,
        ownId: this.ownId,
        remoteId: this.remoteId
      })
    }
  }
}
