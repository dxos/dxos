//
// Copyright 2024 DXOS.org
//

import type { IceProvider } from '../../signal/index.ts';
import type { TransportFactory } from '../transport.ts';
import { getRtcConnectionFactory } from './rtc-connection-factory.ts';
import { RtcPeerConnection } from './rtc-peer-connection.ts';

export const createRtcTransportFactory = (
  webrtcConfig?: RTCConfiguration,
  iceProvider?: IceProvider,
): TransportFactory => {
  const connectionFactory = getRtcConnectionFactory();
  return {
    createTransport: (options) => {
      // TODO(yaroslav): sendSignal is scoped to a swarm, RtcConnections can be cached if it's scoped to a peer
      const connection = new RtcPeerConnection(connectionFactory, {
        ownPeerKey: options.ownPeerKey,
        remotePeerKey: options.remotePeerKey,
        sendSignal: options.sendSignal,
        legacyInitiator: options.initiator,
        webrtcConfig,
        iceProvider,
      });
      return connection.createTransportChannel(options);
    },
  };
};
