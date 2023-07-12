//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { EchoTestPlan } from './plan/echo-spec';
import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';
import { TransportTestPlan } from './plan/transport-spec';

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

// eslint-disable-next-line unused-imports/no-unused-vars
const runEcho = () =>
  runPlan({
    plan: new EchoTestPlan(),
    spec: {
      agents: 2,
      duration: 300_000,
      iterationDelay: 300,

      epochPeriod: 8,
      measureNewAgentSyncTime: true,

      insertionSize: 512,
      operationCount: 1000,

      signalArguments: ['globalsubserver'],
    },
    options: {
      staggerAgents: 5,
      randomSeed: PublicKey.random().toHex(),
      profile: true,
      // repeatAnalysis:
      //   '/Users/dmaretskyi/Projects/protocols/packages/gravity/kube-testing/out/results/2023-07-11T17:12:40-5a291148/test.json',
    },
  });

// eslint-disable-next-line unused-imports/no-unused-vars
const runTransport = () =>
  runPlan({
    plan: new TransportTestPlan(),
    spec: {
      agents: 6,
      swarmsPerAgent: 5,
      duration: 5_000,
      iterationDelay: 1000,
      operationCount: 100,
      signalArguments: ['globalsubserver'],
    },
    options: {
      staggerAgents: 1000,
      randomSeed: PublicKey.random().toHex(),
      profile: true,
      // repeatAnalysis:
      //   '/Users/dmaretskyi/Projects/protocols/packages/gravity/kube-testing/out/results/2023-05-13T16:08:09-f0ba/test.json'
    },
  });

void runEcho();
// void runTransport();
