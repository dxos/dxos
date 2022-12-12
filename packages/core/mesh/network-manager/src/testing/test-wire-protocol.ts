import { Event } from "@dxos/async";
import { PublicKey } from "@dxos/keys";
import { log } from "@dxos/log";
import { TestExtension } from "@dxos/teleport";
import { ComplexMap } from "@dxos/util";
import { createTeleportProtocolFactory, WireProtocolProvider } from "../wire-protocol";

export class TestWireProtocol {
  public readonly connections = new ComplexMap<PublicKey, TestExtension>(PublicKey.hash)
  public readonly connected = new Event<PublicKey>();

  constructor(
    public readonly peerId: PublicKey,
  ) {}

  readonly factory = createTeleportProtocolFactory(async teleport => {
    log('create', {  remotePeerId: teleport.remotePeerId })
    const extension = new TestExtension({
      onClose: async () => {
        this.connections.delete(teleport.remotePeerId);
      }
    });
    this.connections.set(teleport.remotePeerId, extension);
    teleport.addExtension('test', extension);
    this.connected.emit(teleport.remotePeerId);
  })

  async waitForConnection(peerId: PublicKey) {
    if(this.connections.has(peerId)) {
      return this.connections.get(peerId)!;
    }
    log('waitForConnection', { peerId })
    await this.connected.waitFor(connectedId => connectedId.equals(peerId))
    return this.connections.get(peerId)!;
  }

  async testConnection(peerId: PublicKey) {
    const connection = await this.waitForConnection(peerId);
    await connection.test();
  }
}