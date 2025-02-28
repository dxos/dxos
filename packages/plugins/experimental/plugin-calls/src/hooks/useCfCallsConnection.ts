//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import { useStablePojo } from './useStablePojo';
import { type CloudflareCallsConfig, CloudflareCallsPeer } from '../utils';

export type PeerConnectionState = {
  peer?: CloudflareCallsPeer;
  iceConnectionState: RTCIceConnectionState;
};

export const useCfCallsConnection = (config: CloudflareCallsConfig): PeerConnectionState => {
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const stableConfig = useStablePojo(config);
  const [peer, setPeer] = useState<CloudflareCallsPeer>();

  useEffect(() => {
    let newPeer: CloudflareCallsPeer | undefined;
    scheduleMicroTask(new Context(), async () => {
      log.info('useCfCallsConnection', { stableConfig });
      void peer?.close();
      newPeer = new CloudflareCallsPeer(stableConfig);
      await newPeer.open();
      setPeer(newPeer);
    });
    return () => {
      void newPeer?.close();
    };
  }, [stableConfig]);

  useEffect(() => {
    if (!peer?.session?.peerConnection) {
      return;
    }
    const peerConnection = peer.session.peerConnection;

    setIceConnectionState(peerConnection.iceConnectionState);
    const iceConnectionStateChangeHandler = () => {
      setIceConnectionState(peerConnection.iceConnectionState);
    };
    peerConnection.addEventListener('iceconnectionstatechange', iceConnectionStateChangeHandler);
    return () => {
      peerConnection.removeEventListener('connectionstatechange', iceConnectionStateChangeHandler);
    };
  }, [peer?.session?.peerConnection]);

  return {
    peer,
    iceConnectionState,
  };
};
