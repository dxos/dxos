//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { createTheme } from '@mui/material';
import { makeStyles } from '@mui/styles';

import { PublicKey } from '@dxos/crypto';
import { PeerGraph } from '@dxos/devtools-mesh';
import { PeerInfo } from '@dxos/network-manager';

import { Autocomplete } from '../components';
import { useDevtoolsHost } from '../contexts';
import { useAsyncEffect, useStream } from '../hooks';
import { SubscribeToNetworkTopicsResponse } from '../proto';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    padding: theme.spacing(2),
    fontSize: '1.5em',
    overflowY: 'auto',
    overflowX: 'auto'
  },

  filter: {
    display: 'flex',
    flexShrink: 0,
    padding: theme.spacing(1),
    paddingTop: theme.spacing(2)
  },

  graph: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden'
  }
}), { defaultTheme: createTheme({}) });

interface Topic {
  topic: string,
  label: string
}

const networkTopic = (topic: SubscribeToNetworkTopicsResponse.Topic): Topic => {
  return {
    topic: PublicKey.from(topic.topic!).toHex(),
    label: topic.label!
  };
};

export const SwarmGraph = () => {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const [selectedTopic, setSelectedTopic] = useState<string>();
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  const networkTopics = useStream(() => devtoolsHost.SubscribeToNetworkTopics());

  useAsyncEffect(async () => {
    if (!selectedTopic && !PublicKey.isPublicKey(selectedTopic)) {
      setPeers([]);
      return;
    }
    const updatePeers = async () => {
      const { peers } = await devtoolsHost.GetNetworkPeers({ topic: PublicKey.from(selectedTopic).asUint8Array() });
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

  const options = (networkTopics?.topics ?? []).map(networkTopic);

  return (
    <div className={classes.root}>
      <div className={classes.filter}>
        <Autocomplete
          label='Topic'
          options={options.map(topic => topic.topic)}
          value={selectedTopic as any}
          onUpdate={setSelectedTopic}
        />
      </div>
      {selectedTopic ? (
        <PeerGraph
          peers={peers}
          size={{ width: 400, height: 400 }}
        />
      ) : (
        <div>Topic not selected.</div>
      )}
    </div>
  );
};
