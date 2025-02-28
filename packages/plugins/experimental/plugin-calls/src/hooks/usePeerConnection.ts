//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { useStablePojo, useSubscribedState } from './utils';
import { RxjsPeer, type PeerConfig } from '../util';

export type PeerConnectionState = {
  peer: RxjsPeer;
  iceConnectionState: RTCIceConnectionState;
};

export const usePeerConnection = (config: PeerConfig): PeerConnectionState => {
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const stableConfig = useStablePojo(config);
  const peer = useMemo(() => new RxjsPeer(stableConfig), [stableConfig]);
  const peerConnection = useSubscribedState(peer.peerConnection$);
  useEffect(() => {
    if (!peerConnection) {
      return;
    }
    setIceConnectionState(peerConnection.iceConnectionState);
    const iceConnectionStateChangeHandler = () => {
      setIceConnectionState(peerConnection.iceConnectionState);
    };
    peerConnection.addEventListener('iceconnectionstatechange', iceConnectionStateChangeHandler);
    return () => {
      peerConnection.removeEventListener('connectionstatechange', iceConnectionStateChangeHandler);
    };
  }, [peerConnection]);

  return {
    peer,
    iceConnectionState,
  };
};
