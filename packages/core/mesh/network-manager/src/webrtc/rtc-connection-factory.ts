//
// Copyright 2024 DXOS.org
//

export interface RtcConnectionFactory {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  createConnection(config: RTCConfiguration): Promise<RTCPeerConnection>;
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
}

/**
 * Create platform-specific connection factory.
 */
export const getRtcConnectionFactory = (): RtcConnectionFactory => {
  return typeof (globalThis as any).RTCPeerConnection === 'undefined'
    ? new NodeRtcConnectionFactory()
    : new BrowserRtcConnectionFactory();
};
