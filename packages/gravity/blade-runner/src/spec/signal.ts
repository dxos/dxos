//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { analyzeMessages, analyzeSwarmEvents } from '../analysys';
import { type ReplicantsSummary, type TestParams, type TestPlan, type SchedulerEnvImpl } from '../plan';
import { type ReplicantRunParams, SignalReplicant } from '../replicants/signal-replicant';
import { TestBuilder } from '../test-builder';
import { randomArraySlice } from '../util';

export type SignalTestSpec = {
  servers: number;
  serverOverride?: string;
  signalArguments: string[];

  replicants: number;
  peersPerReplicant: number;
  serversPerAgent: number;

  type: 'discovery' | 'signaling';
  topicCount: number;
  topicsPerReplicant: number;

  /**
   * Time to allow everything to init. NOTE: Sometimes first message is not dropped if it is sent too soon.
   */
  startWaitTime: number;
  discoverTimeout: number;
  repeatInterval: number;
  replicantWaitTime: number;
  duration: number;
  platform: 'nodejs';
};

export type SignalAgentConfig = {
  servers: string[];
  topics: string[];
};

export class SignalTestPlan implements TestPlan<SignalTestSpec> {
  builder = new TestBuilder();
  onError?: (err: Error) => void;

  defaultSpec(): SignalTestSpec {
    return {
      servers: 1,
      replicants: 2,
      peersPerReplicant: 10,
      serversPerAgent: 1,
      signalArguments: [
        // 'p2pserver'
        'globalsubserver', // TODO(burdon): Import/define types (for KUBE?)
      ],
      topicCount: 1,
      topicsPerReplicant: 1,
      startWaitTime: 1_000,
      discoverTimeout: 5_000,
      repeatInterval: 1_000,
      replicantWaitTime: 5_000,
      duration: 20_000,
      type: 'discovery',
      platform: 'nodejs',
      // serverOverride: 'ws://localhost:1337/.well-known/dx/signal'
    };
  }

  async run(env: SchedulerEnvImpl<SignalTestSpec>, params: TestParams<SignalTestSpec>): Promise<void> {
    await Promise.all(
      range(params.spec.servers).map((num) =>
        this.builder.createSignalServer(num, params.outDir, params.spec.signalArguments, (err) => {
          log.error('error in signal server', { err });
          this.onError?.(err);
        }),
      ),
    );

    const topics = Array.from(range(params.spec.topicCount)).map(() => PublicKey.random());

    for (let idx = 0; idx < params.spec.replicants; idx++) {
      await env.spawn(SignalReplicant, { platform: params.spec.platform });
    }

    await Promise.all(
      env.replicants.map(async (replicant) => {
        const servers = params.spec.serverOverride
          ? [params.spec.serverOverride]
          : randomArraySlice(
              this.builder.servers.map((server) => server.url()),
              params.spec.serversPerAgent,
            );

        const replicantParams: ReplicantRunParams = {
          replicants: params.spec.replicants,
          peersPerReplicant: params.spec.peersPerReplicant,
          servers,
          type: params.spec.type,
          topics: randomArraySlice(topics, params.spec.topicsPerReplicant).map((topic) => topic.toHex()),
          discoverTimeout: params.spec.discoverTimeout,

          duration: params.spec.duration,
          repeatInterval: params.spec.repeatInterval,
          replicantWaitTime: params.spec.replicantWaitTime,
        };

        return replicant.brain.run(replicantParams);
      }),
    );
  }

  async analyze(params: TestParams<SignalTestSpec>, results: ReplicantsSummary): Promise<any> {
    await this.builder.destroy();

    switch (params.spec.type) {
      case 'discovery': {
        return analyzeSwarmEvents(params, results);
      }
      case 'signaling': {
        return analyzeMessages(results);
      }
      default: {
        throw new Error(`Unknown test type: ${params.spec.type}`);
      }
    }
  }
}
