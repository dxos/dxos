import { createProtoRpcPeer, ProtoRpcPeer, RpcPeer } from "@dxos/rpc";
import { ExtensionContext, Teleport, TeleportExtension } from "./teleport";

describe('Teleport', function() {
  it('test', async function() {

    const onConnect = () => {
      const teleport = new Teleport();

      teleport.addExtension('dxos.mesh.teleport.auth', new AuthExtension({
        onAuthenticated: () => {
          teleport.addExtension('dxos.mesh.teleport.presence', new PresenceExtension())
        },
      }));

      return teleport.stream
    }

  });
})

class AuthExtension implements TeleportExtension {
  constructor({ onAuthenticated }: { onAuthenticated: () => void }) {}

}

class PresenceExtension implements TeleportExtension {
  constructor() {}

  rpc!: ProtoRpcPeer<{}>
  
  async onOpen(context: ExtensionContext): Promise<void> {
    this.rpc = createProtoRpcPeer({
      port: context.createPort('rpc')
    } as any)

    await this.rpc.open()
  }  

  async onClose(err?: Error): Promise<void> {
    await this.rpc.close()
  }
}