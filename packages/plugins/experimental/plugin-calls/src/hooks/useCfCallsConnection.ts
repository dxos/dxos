//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { log } from '@dxos/log';

import { useStablePojo } from './utils';
import { type CloudflareCallsConfig, CloudflareCallsClient } from '../utils';

export type PeerConnectionState = {
  peer: CloudflareCallsClient;
  iceConnectionState: RTCIceConnectionState;
};

export const useCfCallsConnection = (config: CloudflareCallsConfig): PeerConnectionState => {
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const stableConfig = useStablePojo(config);
  const peer = useMemo(() => new CloudflareCallsClient(stableConfig), [stableConfig]);
  useEffect(() => {
    peer.open().catch((err) => log.catch(err));
    return () => {
      void peer.close();
    };
  }, [peer]);

  return {
    peer,
    iceConnectionState,
  };
};
