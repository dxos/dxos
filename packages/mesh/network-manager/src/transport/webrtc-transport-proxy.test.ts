import { schema } from "@dxos/protocols";
import { createProtoRpcPeer } from "@dxos/rpc/dist/src";
import { WebRTCTransportService } from "./webrtc-transport-service";



describe.only('WebRTC Transport Proxy', () => {
  it('Start/stop WebRTCTransportService', async () => {
    const webRTCService = createProtoRpcPeer({
      requested: {},
      exposed: {
        WebRTCService: schema.getService('dxos.mesh.webrtc.WebRTCService'),
      },
      handlers: { WebRTCService: new WebRTCTransportService() },
      port: {
        send: () => { },
        subscribe: () => { }
      },
      encodingOptions: {},
      noHandshake: true,
    })

    await webRTCService.open();
    await webRTCService.close();
  });
});