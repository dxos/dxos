import { PublicKey } from '@dxos/keys';

import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

void runPlan({
  plan: new SignalTestPlan(),
  spec: {
    servers: 1,
    agents: 10,
    serversPerAgent: 1,
    topicCount: 1,
    topicsPerAgent: 1,
    discoverTimeout: 5_000,
    repeatInterval: 3_000,
    duration: 10_000,
    randomSeed: PublicKey.random().toHex(),
    type: 'signaling',
    serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
  },
  options: {
    staggerAgents: 5
  }
});
