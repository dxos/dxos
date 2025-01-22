//
// Copyright 2024 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { usePromise } from './usePromise';
import { useStablePojo } from './useStablePojo';
import { CallsClient, type PeerConfig } from '../utils/calls-client';

export const useCallsConnection = (config: PeerConfig) => {
  const stableConfig = useStablePojo(config);
  const clientPromise = useMemo(() => new CallsClient(stableConfig).open(), [stableConfig]);
  const client = usePromise(clientPromise);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  useEffect(() => {
    if (client?.session.peerConnection) {
      setPeerConnection(client.session.peerConnection);
    }
  }, [client?.session.peerConnection]);

  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');

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
    client,
    iceConnectionState,
  };
};
