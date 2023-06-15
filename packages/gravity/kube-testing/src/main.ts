//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { EchoTestPlan } from './plan/echo-spec';
import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';

// eslint-disable-next-line unused-imports/no-unused-vars
const runSignal = () =>
  runPlan({
    plan: new SignalTestPlan(),
    spec: {
      servers: 1,
      agents: 10,
      peersPerAgent: 10,
      serversPerAgent: 1,
      signalArguments: [
        // 'p2pserver'
        'globalsubserver',
      ],
      topicCount: 1,
      topicsPerAgent: 1,
      startWaitTime: 1_000,
      discoverTimeout: 5_000,
      repeatInterval: 1_000,
      agentWaitTime: 5_000,
      duration: 20_000,
      type: 'discovery',
      // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
    },
    options: {
      staggerAgents: 5,
      randomSeed: PublicKey.random().toHex(),
      // repeatAnalysis:
      //   '/Users/dmaretskyi/Projects/protocols/packages/gravity/kube-testing/out/results/2023-05-13T16:08:09-f0ba/test.json'
    },
  });

const runEcho = () =>
  runPlan({
    plan: new EchoTestPlan(),
    spec: {
      agents: 5,
      duration: 120_000,
      iterationDelay: 1000,
      insertionSize: 1024,
      operationCount: 100,
      signalArguments: ['globalsubserver'],
    },
    options: {
      staggerAgents: 5,
      randomSeed: PublicKey.random().toHex(),
      profile: true,
      // repeatAnalysis:
      //   '/Users/dmaretskyi/Projects/protocols/packages/gravity/kube-testing/out/results/2023-05-13T16:08:09-f0ba/test.json'
    },
  });

void runEcho();
