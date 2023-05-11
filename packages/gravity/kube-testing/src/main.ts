//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

void runPlan({
  plan: new SignalTestPlan(),
  spec: {
    servers: 3,
    agents: 20,
    serversPerAgent: 2,
    signalArguments: [
      'p2pserver'
      // 'globalsubserver'
    ],
    topicCount: 5,
    topicsPerAgent: 3,
    startWaitTime: 1_000,
    discoverTimeout: 5_000,
    repeatInterval: 200,
    agentWaitTime: 5_000,
    duration: 30_000,
    type: 'discovery'
    // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
  },
  options: {
    staggerAgents: 5,
    randomSeed: PublicKey.random().toHex()
    // repeatAnalysis:
    // '/Users/mykola/Documents/dev/dxos/packages/gravity/kube-testing/out/results/2023-05-11T12:29:06-c896/test.json'
  }
});
