//
// Copyright 2024 DXOS.org
//

export type ConnectionInfo = {
  initiator: boolean;
};

export interface RtcConnectionFactory {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  createConnection(config: RTCConfiguration): Promise<RTCPeerConnection>;
  initConnection(connection: RTCPeerConnection, info: ConnectionInfo): Promise<void>;
}

/**
 * Use built-in browser RTCPeerConnection.
 */
class BrowserRtcConnectionFactory implements RtcConnectionFactory {
  async initialize() {}
  async destroy() {}

  async createConnection(config: RTCConfiguration) {
    return new RTCPeerConnection(config);
  }

  async initConnection(connection: RTCPeerConnection, info: ConnectionInfo): Promise<void> {}
}

/**
 * Use `node-datachannel` polyfill.
 * https://github.com/paullouisageneau/libdatachannel
 */
class NodeRtcConnectionFactory implements RtcConnectionFactory {
  // This should be inside the function to avoid triggering `eval` in the global scope.
  // eslint-disable-next-line no-new-func
  private readonly importESM = Function('path', 'return import(path)');

  // TODO(burdon): Do imports here?
  async initialize() {}
  async destroy() {
    const { cleanup } = await this.importESM('node-datachannel');
    cleanup();
  }

  async createConnection(config: RTCConfiguration) {
    const {
      default: { RTCPeerConnection },
    } = await this.importESM('node-datachannel/polyfill');
    return new RTCPeerConnection(config);
  }

  async initConnection(connection: RTCPeerConnection, info: ConnectionInfo): Promise<void> {
    // Initiator peer is responsible for data-channel creation. This triggers the callback in browsers.
    // In node-datachannel/polyfill createOffer() / setLocalDescription(offer) are no-ops, the process
    // is handled by c++ implementation when a data-channel gets created.
    // By calling the method here we'll start waiting for an offer promise that'll resolve on data-channel creation
    // at which point we'll need to send an SDP to a remote peer.
    // https://github.com/murat-dogan/node-datachannel/blob/master/polyfill/RTCPeerConnection.js#L452C1-L459C6
    //
    if (info.initiator) {
      connection.onnegotiationneeded?.(null as any);
    }
  }
}

/**
 * Create platform-specific connection factory.
 */
export const getRtcConnectionFactory = (): RtcConnectionFactory => {
  return typeof (globalThis as any).RTCPeerConnection === 'undefined'
    ? new NodeRtcConnectionFactory()
    : new BrowserRtcConnectionFactory();
};
