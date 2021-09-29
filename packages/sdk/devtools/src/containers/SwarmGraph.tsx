//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core';

import { PublicKey } from '@dxos/crypto';
import { PeerGraph } from '@dxos/network-devtools';
import { PeerInfo } from '@dxos/network-manager';

import AutocompleteFilter from '../components/AutocompleteFilter';
import { useDevtoolsHost } from '../contexts';
import { useStream } from '../hooks';
import { useAsyncEffect } from '../hooks/async-effect';
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
}));

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

export default function Signal () {
  const classes = useStyles();
  const devtoolsHost = useDevtoolsHost();
  const [selectedTopic, setSelectedTopic] = useState('');
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  const networkTopics = useStream(() => devtoolsHost.SubscribeToNetworkTopics({}));

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
        <AutocompleteFilter label='Topic' options={options.map(topic => topic.topic)} onChange={setSelectedTopic} value={selectedTopic as any} />
      </div>
      {selectedTopic
        ? (
        <PeerGraph
          peers={peers}
          size={{ width: 400, height: 400 }}
        />
          )
        : (
        <p>Topic not selected</p>
          )}
    </div>
  );
}
