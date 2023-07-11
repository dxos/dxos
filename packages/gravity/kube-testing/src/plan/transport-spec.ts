//
// Copyright 2023 DXOS.org
//

import { asyncTimeout, sleep, scheduleTaskInterval } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
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

  desiredSwarmTimeout: number;
  fullSwarmTimeout: number;
  iterationDelay: number;
  repeatInterval: number;

  signalArguments: string[];
};

export type TransportAgentConfig = {
  agentIdx: number;
  signalUrl: string;
  swarmTopicIds: string[];
};

export class TransportTestPlan implements TestPlan<TransportTestSpec, TransportAgentConfig> {
  signalBuilder = new SignalTestBuilder();

  async init({ spec, outDir }: TestParams<TransportTestSpec>): Promise<TransportAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

    const swarmTopicIds = range(spec.swarmsPerAgent).map(() => PublicKey.random().toHex());
    return range(spec.agents).map((agentIdx) => ({
      agentIdx,
      signalUrl: signal.url(),
      swarmTopicIds,
    }));
  }

  async run(env: AgentEnv<TransportTestSpec, TransportAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
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

    const ctx = new Context();
    let testCounter = 0;

    const testRun = async () => {
      const context = ctx.derive({
        onError: (err) => {
          log.info('testRun iterration error', { iterationId: testCounter, err });
        },
      });

      log.info('testRun iteration', { iterationId: testCounter });

      // How many connections established within the desired duration.
      await Promise.all(
        swarms.map(async (swarm, swarmIdx) => {
          log.info('joining swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
          await cancelWithContext(context, swarm.join());

          log.info('swarm joined', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
          await sleep(spec.desiredSwarmTimeout);
          log.info('number of connections within duration', { agentIdx, swarmIdx, swarmTopic: swarm.topic, connections: swarm.protocol.connections.size, totalAgents: Object.keys(agents).length });

          // Wait till all peers are connected (with timeout).
          asyncTimeout(async () => {
            await cancelWithContext(
              context,
              swarm.protocol.connected.waitForCondition(() => swarm.protocol.connections.size === Object.keys(agents).length - 1)
            );
            log.info('all peers connected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
          }, spec.fullSwarmTimeout);
        }),
      );

      await env.syncBarrier(`swarms are ready on ${testCounter}`);

      log.info('create test connections');

      // Test connections.
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
          })
      );

      await env.syncBarrier(`connections are tested on ${testCounter}`);

      log.info('closing swarms');
      await Promise.all(
        swarms.map(async (swarm, swarmIdx) => {
          log.info('closing swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
          await cancelWithContext(context, swarm.leave());
          log.info('swarm closed', { agentIdx, swarmIdx, swarmTopic: swarm.topic });

          // Wait till all peers are disconnected (with timeout).
          asyncTimeout(async () => {
            await cancelWithContext(
              context,
              swarm.protocol.disconnected.waitForCondition(() => swarm.protocol.connections.size === 0)
            );
            log.info('all peers disconnected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
          }, spec.fullSwarmTimeout);
        })
      );
    }

    scheduleTaskInterval(
      ctx,
      async () => {
        await env.syncBarrier(`iteration-${testCounter}`);
        await cancelWithContext(ctx, testRun());
        testCounter++;
      },
      spec.repeatInterval,
    );
    await sleep(spec.duration);
    await ctx.dispose();

    log.info('test completed', { agentIdx });
  }

  async finish(params: TestParams<TransportTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
    log.info('finished shutdown');
  }
}
