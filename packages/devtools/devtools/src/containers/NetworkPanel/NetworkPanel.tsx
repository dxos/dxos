//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box } from '@mui/material';

import { PeerGraph } from '@dxos/devtools-mesh';
import { PeerInfo } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';
import { useAsyncEffect } from '@dxos/react-async';
import { useDevtools, useStream } from '@dxos/react-client';

import { Autocomplete } from '../../components';
import { SubscribeToNetworkTopicsResponse } from '../../proto';

interface Topic {
  topic: string
  label: string
}

const networkTopic = (topic: SubscribeToNetworkTopicsResponse.Topic): Topic => ({
  topic: PublicKey.from(topic.topic!).toHex(),
  label: topic.label!
});

export const NetworkPanel = () => {
  const devtoolsHost = useDevtools();
  const [selectedTopic, setSelectedTopic] = useState<string>();
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  const { topics } = useStream(() => devtoolsHost.subscribeToNetworkTopics(), {});

  useAsyncEffect(async () => {
    if (!selectedTopic && !PublicKey.isPublicKey(selectedTopic)) {
      setPeers([]);
      return;
    }

    const updatePeers = async () => {
      const { peers } = await devtoolsHost.getNetworkPeers({ topic: PublicKey.from(selectedTopic).asUint8Array() });
      peers && setPeers(peers.map((peer: any) => ({
        ...peer,
        id: PublicKey.from(peer.id),
        connections: peer.connections.map((connection: any) => PublicKey.from(connection))
      })));
    };

    await updatePeers();
    const interval = setInterval(updatePeers, 2000);
    return () => clearInterval(interval);
  }, [selectedTopic]);

  const options = (topics ?? []).map(networkTopic);

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      padding: 2,
      fontSize: '1.5em',
      overflow: 'hidden',
      overflowY: 'auto',
      overflowX: 'auto'
    }}>
      <Box sx={{
        display: 'flex',
        flexShrink: 0,
        padding: 1,
        paddingTop: 2
      }}>
        <Autocomplete
          label='Topic'
          options={options.map(topic => topic.topic)}
          value={selectedTopic as any}
          onUpdate={setSelectedTopic}
        />
      </Box>
      {selectedTopic ? (
        <PeerGraph
          peers={peers}
          size={{ width: 400, height: 400 }}
        />
      ) : (
        <div>Topic not selected.</div>
      )}
    </Box>
  );
};
