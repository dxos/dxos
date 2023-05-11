//
// Copyright 2023 DXOS.org
//

import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

void runPlan({
  plan: new SignalTestPlan(),
  spec: {
    servers: 1,
    agents: 30,
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
    duration: 10_000,
    type: 'discovery'
    // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
  },
  options: {
    staggerAgents: 5
    // repeatAnalysis: '/Users/dmaretskyi/Projects/protocols/packages/gravity/kube-testing/out/results/2023-05-11T10:49:46-0cba/test.json'
  }
});
