//
// Copyright 2024 DXOS.org
//

import { Mutex } from '@dxos/async';

export type ConnectionInfo = {
  initiator: boolean;
};

export interface RtcConnectionFactory {
  initialize(): Promise<void>;
  onConnectionDestroyed(): Promise<void>;
  createConnection(config: RTCConfiguration): Promise<RTCPeerConnection>;
  initConnection(connection: RTCPeerConnection, info: ConnectionInfo): Promise<void>;
}

/**
 * Use built-in browser RTCPeerConnection.
 */
class BrowserRtcConnectionFactory implements RtcConnectionFactory {
  async initialize(): Promise<void> {}
  async onConnectionDestroyed(): Promise<void> {}

  async createConnection(config: RTCConfiguration): Promise<RTCPeerConnection> {
    return new RTCPeerConnection(config);
  }

  async initConnection(connection: RTCPeerConnection, info: ConnectionInfo): Promise<void> {}
}

/**
 * Use `node-datachannel` polyfill.
 * https://github.com/paullouisageneau/libdatachannel
 */
class NodeRtcConnectionFactory implements RtcConnectionFactory {
  private static _createdConnections = 0;
  private static _cleanupMutex = new Mutex();

  // This should be inside the function to avoid triggering `eval` in the global scope.
  // eslint-disable-next-line @typescript-eslint/no-implied-eval

  // TODO(burdon): Do imports here?
  async initialize(): Promise<void> {}
  async onConnectionDestroyed(): Promise<void> {
    return NodeRtcConnectionFactory._cleanupMutex.executeSynchronized(async () => {
      if (--NodeRtcConnectionFactory._createdConnections === 0) {
        (await import('#node-datachannel')).cleanup();
      }
    });
  }

  async createConnection(config: RTCConfiguration): Promise<RTCPeerConnection> {
    return NodeRtcConnectionFactory._cleanupMutex.executeSynchronized(async () => {
      const { RTCPeerConnection } = await import('#node-datachannel/polyfill');
      NodeRtcConnectionFactory._createdConnections++;
      return new RTCPeerConnection(config);
    }) as any;
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
export const getRtcConnectionFactory = (): RtcConnectionFactory =>
  typeof (globalThis as any).RTCPeerConnection === 'undefined'
    ? new NodeRtcConnectionFactory()
    : new BrowserRtcConnectionFactory();
