//
// Copyright 2020 DXOS.org
//

import React, { useState, useEffect } from 'react';
import useResizeAware from 'react-resize-aware';
import { MemoryRouter, NavLink, Route, Routes } from 'react-router-dom';

import { Select, SelectChangeEvent, MenuItem } from '@mui/material';

import { PublicKey } from '@dxos/keys';
import {
  SignalManager,
  CommandTrace,
  SignalStatus,
  WebsocketSignalManager
} from '@dxos/messaging';
import {
  FullyConnectedTopology,
  Swarm,
  MMSTTopology,
  StarTopology,
  NetworkManager,
  SwarmMapper,
  transportProtocolProvider,
  PeerInfo,
  Topology,
  SwarmInfo,
  ConnectionLog,
  createWebRTCTransportFactory
} from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';
import { FullScreen } from '@dxos/react-components';

import { PeerGraph, SignalStatusComp, SignalTrace, SwarmDetails } from '../src/index.js';

export default {
  title: 'Devtools/Topology'
};

const createPeer = async (controlTopic: PublicKey, peerId: PublicKey, topologyFactory: () => Topology) => {
  // TODO(burdon): Remove hard-coded deps.
  const signalManager = new WebsocketSignalManager(['wss://apollo3.kube.moon.dxos.network/dxos/signal']);
  await signalManager.subscribeMessages(peerId);
  const networkManager = new NetworkManager({
    signalManager,
    transportFactory: createWebRTCTransportFactory(),
    log: true
  });

  const presencePlugin = new PresencePlugin(peerId.asBuffer());
  await networkManager.joinProtocolSwarm({
    topic: controlTopic,
    peerId,
    topology: topologyFactory(),
    protocol: transportProtocolProvider(controlTopic.asBuffer(), peerId.asBuffer(), presencePlugin),
    presence: presencePlugin
  });

  return {
    networkManager,
    swarm: networkManager.getSwarm(controlTopic)!,
    map: networkManager.getSwarmMap(controlTopic)!,
    log: networkManager.connectionLog!,
    signal: networkManager.signal
  };
};

const topologyMap: Record<string, (topic: PublicKey) => any> = {
  'Fully-connected': () => new FullyConnectedTopology(),
  'MMST': () => new MMSTTopology(),
  'Star': (topic) => new StarTopology(topic)
};

const GraphDemo = ({ topic }: { topic: PublicKey }) => {
  const [topologyType, setTopologyType] = useState('Fully-connected');
  const [topology, setTopology] = useState<() => Topology>(() => () => new FullyConnectedTopology());

  const [controlPeer, setControlPeer] = useState<{
    swarm: Swarm
    map: SwarmMapper
    signal: SignalManager
    log: ConnectionLog
  }>();

  useEffect(() => {
    setTopology(topologyMap[topologyType](topic));
  }, [topologyType]);

  useEffect(() => {
    void createPeer(topic, topic, topology).then(peer => setControlPeer(peer));
  }, []);

  const [peers, setPeers] = useState<any[]>([]);
  useEffect(() => {
    void controlPeer?.swarm.setTopology(topology());
    for (const peer of peers) {
      void peer.swarm.setTopology(topology());
    }
  }, [topology]);

  const addPeers = async (n: number) => {
    for (let i = 0; i < n; i++) {
      const peer = await createPeer(topic, PublicKey.random(), topology);
      setPeers(peers => [...peers, peer]);
    }
  };

  const killPeer = (id: PublicKey) => {
    const peer = peers.find(peer => peer.swarm.ownPeerId.equals(id));
    console.log('leave', peer);
    peer && peer.networkManager.leaveProtocolSwarm(topic);
  };

  const [peerMap, setPeerMap] = useState<PeerInfo[]>([]);
  useEffect(() => {
    controlPeer?.map.mapUpdated.on(peers => {
      setPeerMap(peers);
    });
    controlPeer && setPeerMap(controlPeer.map.peers);
  }, [controlPeer]);

  const [signalStatus, setSignalStatus] = useState<SignalStatus[]>([]);
  useEffect(() => controlPeer?.signal.statusChanged.on(status => {
    setSignalStatus(status);
  }), [controlPeer]);

  const [signalTrace, setSignalTrace] = useState<CommandTrace[]>([]);
  useEffect(() => controlPeer?.signal.commandTrace.on(msg => {
    setSignalTrace(msgs => [...msgs, msg]);
  }), [controlPeer]);

  const [swarmInfo, setSwarmInfo] = useState<SwarmInfo[]>([]);
  useEffect(() => {
    if (controlPeer) {
      setSwarmInfo(controlPeer.log.swarms);
    }
    return controlPeer?.log.update.on(() => {
      setSwarmInfo(controlPeer!.log.swarms);
    });
  }, [controlPeer]);

  const [resizeListener, size] = useResizeAware();
  const { height } = size;

  return (
    <FullScreen>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <Select
            value={topologyType}
            onChange={(event: SelectChangeEvent) => setTopologyType(event.target.value)}
          >
            {Object.keys(topologyType).map((topologyType) => (
              <MenuItem key={topologyType} value={topologyType}>{topologyType}</MenuItem>
            ))}
          </Select>

          <div style={{ position: 'absolute' }}>
            <button onClick={() => addPeers(1)}>Add peer</button>
            <button onClick={() => addPeers(5)}>Add 5 peers</button>
            <button onClick={() => addPeers(10)}>Add 10 peers</button>
          </div>

          {resizeListener}
          <PeerGraph
            peers={peerMap}
            size={{ width: 500, height }}
            onClick={killPeer}
          />
        </div>

        <div>
          <MemoryRouter>
            <div>
              <NavLink to='/'>Signal</NavLink>
              <NavLink to='/swarms'>Swarms</NavLink>
            </div>
            <Routes>
              <Route path='/'>
                <SignalStatusComp status={signalStatus} />
                <SignalTrace trace={signalTrace} />
              </Route>
              <Route path='/swarms'>
                <SwarmDetails swarms={swarmInfo} />
              </Route>
            </Routes>
          </MemoryRouter>
        </div>
      </div>
    </FullScreen>
  );
};

export const Primary = () => {
  const [topic] = useState(() => PublicKey.random());
  return <GraphDemo topic={topic} />;
};
