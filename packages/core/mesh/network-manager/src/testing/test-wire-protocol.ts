import { Event } from "@dxos/async";
import { PublicKey } from "@dxos/keys";
import { TestExtension } from "@dxos/teleport";
import { ComplexMap } from "@dxos/util";
import { createTeleportProtocolFactory, WireProtocolProvider } from "../wire-protocol";

export class TestWireProtocol {
  public readonly connections = new ComplexMap<PublicKey, TestExtension>(PublicKey.hash)
  public readonly connected = new Event<TestExtension>();

  constructor(
    public readonly peerId: PublicKey,
  ) {}

  readonly factory = createTeleportProtocolFactory(async teleport => {
    const extension = new TestExtension({
      onClose: async () => {
        this.connections.delete(teleport.remotePeerId);
      }
    });
    this.connections.set(teleport.remotePeerId, extension);
    teleport.addExtension('test', extension);
  })

  async waitForConnection(peerId: PublicKey) {
    if(this.connections.has(peerId)) {
      return this.connections.get(peerId);
    }
    return this.connected.waitFor(connection => connection.remotePeerId.equals(peerId));
  }
}