//
// Copyright 2023 DXOS.org
//

import { sleep } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TestBuilder as NetworkManagerTestBuilder } from '@dxos/network-manager/testing';
import { range } from '@dxos/util';

import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { AgentEnv } from './agent-env';
import { PlanResults, TestParams, TestPlan } from './spec-base';

export type TransportTestSpec = {
  agents: number;
  swarmsPerAgent: number;
  duration: number;
  iterationDelay: number;

  insertionSize: number;
  operationCount: number;

  signalArguments: string[];
};

export type TransportAgentConfig = {
  agentIdx: number;
  signalUrl: string;
  swarmTopicIds: string[];
};

export class TransportTestPlan implements TestPlan<TransportTestSpec, TransportAgentConfig> {
  signalBuilder = new SignalTestBuilder();

  // networkManagerBuilder  = new NetworkManagerTestBuilder();
  // builder = new NetworkManagerTestBuilder();

  async init({ spec, outDir }: TestParams<TransportTestSpec>): Promise<TransportAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

    const swarmTopicIds = range(spec.swarmsPerAgent).map(() => PublicKey.random().toHex());
    // this.builder = new NetworkManagerTestBuilder({ signalHost: signal.url() });
    return range(spec.agents).map((agentIdx) => ({
      agentIdx,
      signalUrl: signal.url(),
      swarmTopicIds,
    }));
  }

  async run(env: AgentEnv<TransportTestSpec, TransportAgentConfig>): Promise<void> {
    const { config, spec } = env.params;
    const { agentIdx, swarmTopicIds, signalUrl } = config;

    log.info('run', {
      agentIdx,
      runnerAgentIdx: config.agentIdx,
      agentId: env.params.agentId.substring(0, 8),
    });

    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(env.params.agentId));
    await peer.open();
    log.info('peer created', { agentIdx });

    log.info(`creating ${swarmTopicIds.length} swarms`, { agentIdx });

    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic);
    });

    log.info('swarms created', { agentIdx });

    await Promise.all(
      swarms.map(async (swarm, swarmIdx) => {
        log.info('joining swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
        await swarm.join();
        await env.syncBarrier(`swarm ${swarmIdx} joined`);
        log.info('swarm joined', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      }),
    );

    log.info('all swarms joined', { agentIdx });

    log.info('create test connections');
    await Promise.all(
      Object.keys(env.params.agents)
        .filter((agentId) => agentId !== env.params.agentId)
        .map(async (agentId) => {
          swarms.forEach(async (swarm, swarmIdx) => {
            log.info('testing connection', { agentIdx, swarmIdx });
            try {
              await swarm.protocol.testConnection(PublicKey.from(agentId), 'hello world');
              log.info('test connection succeded', { agentIdx, swarmIdx });
            } catch (error) {
              log.info('test connection failed', { agentIdx, swarmIdx });
            }
          });
        }),
    );

    log.info('sleeping', { agentIdx });
    await sleep(spec.duration);
    log.info('test completed', { agentIdx });
  }

  async finish(params: TestParams<TransportTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
    log.info('finished shutdown');
  }
}
