import { PublicKey } from "@dxos/keys";
import { Duplex } from "node:stream";
import { MeshProtocolProvider } from "./protocol-factory";
import { discoveryKey } from "@dxos/crypto";
import { Protocol } from "@dxos/mesh-protocol";

export type WireProtocolParams = {
  initiator: boolean;
  localPeerId: PublicKey;
  remotePeerId: PublicKey;
  topic: PublicKey;
}

export type WireProtocolProvider = (params: WireProtocolParams) => WireProtocol;

export interface WireProtocol {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  stream: Duplex

  /**
   * @deprecated Only for devtools comapatibility.
   */
  protocol?: Protocol
}

export const adaptProtocolProvider = (factory: MeshProtocolProvider): WireProtocolProvider =>
  ({ initiator, localPeerId, remotePeerId, topic }) => {
    const protocol = factory({ channel: discoveryKey(topic), initiator });
    return {
      initialize: () => protocol.open(),
      destroy: () => protocol.close(),
      stream: protocol.stream,
      protocol
    };
  }