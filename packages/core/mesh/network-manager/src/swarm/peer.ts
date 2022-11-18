import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import { Protocol } from "@dxos/mesh-protocol";
import assert from "assert";
import { SignalMessaging } from "../signal";
import { TransportFactory } from "../transport";
import { Connection, ConnectionState } from "./connection";

export class Peer {
  public connection?: Connection;
  
  /**
   * Whether the peer is currently advertizing itself on the signal-network. 
   */
  public advertizing = false;

  constructor(
    public readonly id: PublicKey,
  ) {}

  /**
   * Initialize connection.
   */
  createConnection(
    // TODO(dmaretskyi): Make some of those fields.
    topic: PublicKey,
    ownPeerId: PublicKey,
    signalMessaging: SignalMessaging, 
    initiator: boolean,
    sessionId: PublicKey,
    protocol: Protocol,
    transportFactory: TransportFactory,
    onStateChange: (state: ConnectionState) => void,
    onError: (error: Error) => void,
  ) {
    log('creating connection', { topic, peerId: ownPeerId, remoteId: this.id, initiator, sessionId });
    assert(!this.connection, 'Already connected.');

    this.connection = new Connection(
      topic,
      ownPeerId,
      this.id,
      sessionId,
      initiator,
      signalMessaging,
      protocol,
      transportFactory,
    );
    this.connection.errors.handle((err) => {
      onError(err);
    });
    this.connection.stateChanged.on((state) => {
      onStateChange(state);
    });

    return this.connection; 
  }
}