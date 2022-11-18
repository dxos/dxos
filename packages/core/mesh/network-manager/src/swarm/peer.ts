import { PublicKey } from "@dxos/keys";
import { Connection } from "./connection";

export class Peer {
  public connection?: Connection;
  
  /**
   * Whether the peer is currently advertizing itself on the signal-network. 
   */
  public advertizing = false;

  constructor(
    public readonly id: PublicKey,
  ) {}
}