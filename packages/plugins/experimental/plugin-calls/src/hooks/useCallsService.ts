//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';

import { useStablePojo } from './useStablePojo';
import { CallsServicePeer, type CallsServiceConfig } from '../util';

export type PeerConnectionState = {
  peer?: CallsServicePeer;
  iceConnectionState: RTCIceConnectionState;
};

export const useCallsService = (config: CallsServiceConfig): PeerConnectionState => {
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const stableConfig = useStablePojo(config);
  const [peer, setPeer] = useState<CallsServicePeer>();

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      void peer?.close();
      const newPeer = new CallsServicePeer(stableConfig);
      ctx.onDispose(() => newPeer?.close());
      await newPeer.open();
      setPeer(newPeer);
    });
    return () => {
      void ctx.dispose();
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
