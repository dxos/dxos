//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { TransportKind } from '@dxos/network-manager';

import { runPlan, RunPlanParams } from './plan';
import { EchoTestPlan, ReplicationTestPlan, SignalTestPlan, TransportTestPlan } from './spec';

// eslint-disable-next-line unused-imports/no-unused-vars
const DXOS_REPO = process.env.DXOS_REPO;

// TODO(burdon): Factor out plan to YML files.
const plans: { [key: string]: () => RunPlanParams<any, any> } = {
  signal: () => ({
    plan: new SignalTestPlan(),
    spec: {
      servers: 1,
      agents: 10,
      peersPerAgent: 10,
      serversPerAgent: 1,
      signalArguments: [
        // 'p2pserver'
        'globalsubserver', // TODO(burdon): Import/define types (for KUBE?)
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
      // repeatAnalysis: `${DXOS_REPO}/packages/gravity/kube-testing/out/results/2023-05-13T16:08:09-f0ba/test.json`
    },
  }),

  transport: () => ({
    plan: new TransportTestPlan(),
    spec: {
      agents: 2,
      swarmsPerAgent: 1,
      duration: 60_000,
      transport: TransportKind.SIMPLE_PEER,
      targetSwarmTimeout: 10_000,
      fullSwarmTimeout: 60_000,
      iterationDelay: 1_000,
      streamsDelay: 60_000,
      signalArguments: ['globalsubserver'],
      repeatInterval: 5_000,
      streamLoadInterval: 1,
      streamLoadChunkSize: 5_000_000,
      showPNG: true,
    },
    options: {
      staggerAgents: 1000,
      randomSeed: PublicKey.random().toHex(),
      // profile: true,
    },
  }),

  echo: () => ({
    plan: new EchoTestPlan(),
    spec: {
      agents: 4,
      duration: 1_800_000,
      iterationDelay: 2000,
      epochPeriod: 8,
      // measureNewAgentSyncTime: true,
      measureNewAgentSyncTime: false,
      insertionSize: 128,
      operationCount: 20,
      signalArguments: ['globalsubserver'],
      showPNG: false,
      // transport: TransportKind.TCP,
      transport: TransportKind.SIMPLE_PEER,
      withReconnects: true,
    },
    options: {
      staggerAgents: 5,
      randomSeed: PublicKey.random().toHex(),
      profile: true,
    },
  }),

  replication: () => ({
    plan: new ReplicationTestPlan(),
    spec: {
      agents: 2,
      swarmsPerAgent: 1,
      duration: 3_000,
      transport: TransportKind.SIMPLE_PEER_PROXY,
      targetSwarmTimeout: 1_000,
      fullSwarmTimeout: 10_000,
      signalArguments: ['globalsubserver'],
      repeatInterval: 100,
      feedsPerSwarm: 1,
      feedAppendInterval: 0,
      feedMessageSize: 500,
      // feedLoadDuration: 10_000,
      feedMessageCount: 5_000,
    },
    options: {
      staggerAgents: 1000,
      randomSeed: PublicKey.random().toHex(),
    },
  }),
};

/**
 * Requirements:
 * - Configure Redis (e.g., via Docker desktop) and export port.
 * - Install Go version 19.
 * - Set the KUBE_HOME environment variable to the root of the kube repo.
 *
 * Example: KUBE_HOME=~/Code/dxos/kube p run-tests echo
 */
const start = async () => {
  const [, , name] = process.argv;
  const spec = name ?? process.env.GRAVITY_SPEC; // Env set when forked by test runner.
  const planGenerator = plans[spec];
  if (planGenerator) {
    const plan: RunPlanParams<any, any> = planGenerator();

    // TODO(burdon): Option.
    const repeatAnalysis = undefined;
    if (repeatAnalysis) {
      plan.options.repeatAnalysis = repeatAnalysis;
    }

    await runPlan(name, plan);
  } else {
    console.warn(`\nRun with test: [${Object.keys(plans).join(', ')}]`);
  }
};

void start();
