//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { Executor } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

const executor = new Executor({
  plan: new SignalTestPlan(),
  spec: {
    servers: 1,
    agents: 10,
    serversPerAgent: 1,
    signalArguments: [
      'p2pserver'
      // 'globalsubserver'
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
    staggerAgents: 5,
    randomSeed: PublicKey.random().toHex()
  }
});

void executor.run().catch((err) => {
  log.catch(err);
});
