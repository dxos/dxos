
import { Any } from "./proto/gen/google/protobuf"
import { SignalManager } from "./signal-manager"
import { PublicKey } from '@dxos/protocols';
import debug from "debug";

interface MessengerOptions {
  ownPeerId: PublicKey
  receive: (author: PublicKey, payload: Any) => Promise<void>
  signalManager: SignalManager
}

const log = debug('dxos:signaling:messenger');

export class Messenger {
  private readonly _ownPeerId: PublicKey;
  private readonly _receive: (author: PublicKey, payload: Any) => Promise<void>;
  private readonly _signalManager: SignalManager;

  constructor ({
    ownPeerId,
    receive,
    signalManager
  }: MessengerOptions) {
    this._ownPeerId = ownPeerId;
    this._receive = receive;

    this._signalManager = signalManager;
    this._signalManager.subscribeMessages(this._ownPeerId);
    this._signalManager.onMessage.on(([author, recipient, payload]) => {
      log(`Received message from ${author}`);
      this._receive(author, payload)
    });
  }

  public get ownPeerId (): PublicKey {
    return this._ownPeerId
  }

  // TODO(mykola): make reliable.
  async message (recipient: PublicKey, payload: Any): Promise<void> {
    return this._signalManager.message(this._ownPeerId, recipient, payload);
  }
}

