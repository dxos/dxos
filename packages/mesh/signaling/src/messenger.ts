import { PublicKey } from "packages/common/protocols/dist/src"
import { PeerId } from "packages/halo/credentials/dist/src/typedefs"
import { Any } from "./proto/gen/google/protobuf"
import { SignalManager } from "./signal-manager"


interface MessengerOptions {
  ownPeerId: PublicKey
  receive: (author: PeerId, payload: Any) => Promise<void>
  signalManager: SignalManager
}

export class Messenger {
  private readonly _ownPeerId: PublicKey
  private readonly _receive: (author: PeerId, payload: Any) => Promise<void>
  private readonly _signalManager: SignalManager

  constructor ({
    ownPeerId,
    receive,
    signalManager
  }: MessengerOptions) {
    this._ownPeerId = ownPeerId
    this._receive = receive
    this._signalManager = signalManager
  }

}

