//
// Copyright 2024 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Runtime } from '@dxos/protocols/proto/dxos/config';

import { createIceProvider } from '../../signal';
import type { IceProvider } from '../../signal';
import { type TransportFactory, TransportFactoryService } from '../transport';
import { getRtcConnectionFactory } from './rtc-connection-factory';
import { RtcPeerConnection } from './rtc-peer-connection';

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

/**
 * Layer constructing the WebRTC {@link TransportFactory} from optional ICE configuration.
 */
export const RtcTransportFactoryLayer = (options?: {
  webrtcConfig?: RTCConfiguration;
  iceProviders?: Runtime.Services.IceProvider[];
}): Layer.Layer<TransportFactoryService> =>
  Layer.sync(TransportFactoryService, () =>
    createRtcTransportFactory(options?.webrtcConfig, options?.iceProviders && createIceProvider(options.iceProviders)),
  );
