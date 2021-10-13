//
// Copyright 2020 DXOS.org
//

import { select } from '@storybook/addon-knobs';
import React, { useState, useEffect } from 'react';
import useResizeAware from 'react-resize-aware';
import { MemoryRouter, NavLink, Switch, Route } from 'react-router-dom';

import { PublicKey } from '@dxos/crypto';
import { FullScreen } from '@dxos/gem-core';
import {
  FullyConnectedTopology,
  Swarm,
  MMSTTopology,
  StarTopology,
  NetworkManager,
  SignalApi,
  SignalManager,
  SwarmMapper,
  transportProtocolProvider,
  PeerInfo,
  Topology,
  SwarmInfo,
  ConnectionLog
} from '@dxos/network-manager';
import { PresencePlugin } from '@dxos/protocol-plugin-presence';

import { PeerGraph, SignalStatus, SignalTrace } from '../src';
import { SwarmDetails } from '../src/SwarmDetails';

export default {
  title: 'Devtools'
};

export interface SwarmsTabProps {
  swarmInfo: SwarmInfo[]
}

const createPeer = async (controlTopic: PublicKey, peerId: PublicKey, topologyFactory: () => Topology) => {
  const networkManager = new NetworkManager({
    signal: ['wss://apollo3.kube.moon.dxos.network/dxos/signal'],
    log: true
  });
  const presencePlugin = new PresencePlugin(peerId.asBuffer());
  networkManager.joinProtocolSwarm({
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

const GraphDemo = ({ topic, topology }: { topic: PublicKey, topology: () => Topology }) => {
  const [controlPeer, setControlPeer] = useState<{ swarm: Swarm, map: SwarmMapper, signal: SignalManager, log: ConnectionLog }>();
  useEffect(() => {
    void createPeer(topic, topic, topology).then(peer => setControlPeer(peer));
  }, []);

  const [peers, setPeers] = useState<any[]>([]);
  useEffect(() => {
    controlPeer?.swarm.setTopology(topology());
    for (const peer of peers) {
      peer.swarm.setTopology(topology());
    }
  }, [topology]);

  async function addPeers (n: number) {
    for (let i = 0; i < n; i++) {
      const peer = await createPeer(topic, PublicKey.random(), topology);
      setPeers(peers => [...peers, peer]);
    }
  }

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

  const [signalStatus, setSignalStatus] = useState<SignalApi.Status[]>([]);
  useEffect(() => {
    return controlPeer?.signal.statusChanged.on(status => {
      setSignalStatus(status);
    });
  }, [controlPeer]);

  const [signalTrace, setSignalTrace] = useState<SignalApi.CommandTrace[]>([]);
  useEffect(() => {
    return controlPeer?.signal.commandTrace.on(msg => {
      setSignalTrace(msgs => [...msgs, msg]);
    });
  }, [controlPeer]);

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
            <Switch>
              <Route exact path='/'>
                <SignalStatus status={signalStatus} />
                <SignalTrace trace={signalTrace} />
              </Route>
              <Route path='/swarms'>
                <SwarmDetails swarms={swarmInfo} />
              </Route>
            </Switch>
          </MemoryRouter>
        </div>
      </div>
    </FullScreen>
  );
};

export const withGraph = () => {
  const [topic] = useState(() => PublicKey.random());

  const [topology, setTopology] = useState<() => Topology>(() => () => new FullyConnectedTopology());

  const topologySelect = select('Topology', ['Fully-connected', 'MMST', 'Star'], 'Fully-connected');
  useEffect(() => {
    switch (topologySelect) {
      case 'Fully-connected': {
        setTopology(() => () => new FullyConnectedTopology());
        break;
      }
      case 'MMST': {
        setTopology(() => () => new MMSTTopology());
        break;
      }
      case 'Star': {
        setTopology(() => () => new StarTopology(topic));
      }
    }
  }, [topologySelect]);

  return <GraphDemo topic={topic} topology={topology} />;
};
