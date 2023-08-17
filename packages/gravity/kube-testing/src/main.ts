//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';

import { EchoTestPlan } from './plan/echo-spec';
import { runPlan } from './plan/run-plan';
import { SignalTestPlan } from './plan/signal-spec';
import { TransportTestPlan } from './plan/transport-spec';

// TODO(burdon): Factor out plan to YML files.

/**
 *
 */
const runSignal = async () =>
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
      //  `${process.env.HOME}/Projects/protocols/packages/gravity/kube-testing/out/results/2023-05-13T16:08:09-f0ba/test.json`
    },
  });

/**
 *
 */
const runTransport = async () =>
  runPlan({
    plan: new TransportTestPlan(),
    spec: {
      agents: 2,
      swarmsPerAgent: 1,
      duration: 60_000,
      transport: 'webrtc-proxy',
      targetSwarmTimeout: 10_000,
      fullSwarmTimeout: 60_000,
      iterationDelay: 1_000,
      streamsDelay: 60_000,
      signalArguments: ['globalsubserver'],
      repeatInterval: 5_000,
      streamLoadInterval: 1,
      streamLoadChunkSize: 5_000_000,
    },
    options: {
      staggerAgents: 1000,
      randomSeed: PublicKey.random().toHex(),
      // profile: true,
      // repeatAnalysis:
      //  `${process.env.HOME}/Projects/protocols/packages/gravity/kube-testing/out/results/2023-08-09T11:36:28-784ae212/test.json`
    },
  });

/**
 *
 */
const runEcho = async () =>
  runPlan({
    plan: new EchoTestPlan(),
    spec: {
      agents: 2,
      duration: 300_000,
      iterationDelay: 300,
      epochPeriod: 8,
      // measureNewAgentSyncTime: true,
      measureNewAgentSyncTime: false,
      insertionSize: 512,
      operationCount: 1000,
      signalArguments: ['globalsubserver'],
    },
    options: {
      staggerAgents: 5,
      randomSeed: PublicKey.random().toHex(),
      profile: true,
      // repeatAnalysis:
      //  `${process.env.HOME}/Projects/protocols/packages/gravity/kube-testing/out/results/2023-07-11T17:12:40-5a291148/test.json`,
    },
  });

const tests: { [key: string]: () => Promise<void> } = {
  signal: () => runSignal(),
  transport: () => runTransport(),
  echo: () => runEcho(),
};

/**
 * KUBE_HOME=~/Code/dxos/kube p run-tests echo
 */
const start = () => {
  const [, , name] = process.argv;
  const test = name && tests[name];
  if (test) {
    void test();
  } else {
    console.warn(`\nRun with test name: ${Object.keys(tests).join(', ')}`);
  }
};

start();
