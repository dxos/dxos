//
// Copyright 2023 DXOS.org
//

import { LibDataChannelTransport } from './libdatachannel-transport';
import { SimplePeerTransport } from './simplepeer-transport';
import { TransportFactory } from './transport';

export const createWebRTCTransportFactory = (webrtcConfig?: any, webrtcLibrary = 'SimplePeer'): TransportFactory => {
  switch (webrtcLibrary) {
    case 'SimplePeer':
      console.log('using SimplePeer for WebRTCTransport');
      return {
        createTransport: (params) =>
          new SimplePeerTransport({
            ...params,
            webrtcConfig,
          }),
      };
    case 'LibDataChannel': {
      console.log('using LibDataChannel for WebRTCTransport');
      return {
        createTransport: (params) =>
          new LibDataChannelTransport({
            ...params,
            webrtcConfig,
          }),
      };
    }
    default: {
      throw new Error(`Unknown WebRTC library ${webrtcLibrary}`);
    }
  }
};
