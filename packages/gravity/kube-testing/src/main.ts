//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

void runPlan({
  plan: new SignalTestPlan(),
  spec: {
    servers: 20,
    agents: 40,
    serversPerAgent: 1,
    signalArguments: [
      // 'p2pserver'
      'globalsubserver'
    ],
    topicCount: 1,
    topicsPerAgent: 1,
    discoverTimeout: 5_000,
    repeatInterval: 200,
    agentWaitTime: 5_000,
    duration: 30_000,
    randomSeed: PublicKey.random().toHex(),
    type: 'signaling'
    // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
  },
  options: {
    staggerAgents: 5
  }
});
