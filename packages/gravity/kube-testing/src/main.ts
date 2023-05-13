//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

void runPlan({
  plan: new SignalTestPlan(),
  spec: {
    servers: 1,
    agents: 5,
    peersPerAgent: 5,
    serversPerAgent: 1,
    signalArguments: [
      // 'p2pserver'
      'globalsubserver'
    ],
    topicCount: 1,
    topicsPerAgent: 1,
    startWaitTime: 1_000,
    discoverTimeout: 5_000,
    repeatInterval: 200,
    agentWaitTime: 5_000,
    duration: 20_000,
    type: 'discovery'
    // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
  },
  options: {
    staggerAgents: 5,
    randomSeed: PublicKey.random().toHex()
    // repeatAnalysis:
    //   '/Users/mykola/Documents/dev/dxos/packages/gravity/kube-testing/out/results/2023-05-12T13:19:57-3c1d/test.json'
  }
});
