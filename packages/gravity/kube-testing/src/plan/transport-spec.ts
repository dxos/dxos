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

  streamLoadInterval: number;
  streamLoadChunkSize: number;

  desiredSwarmTimeout: number;
  fullSwarmTimeout: number;
  iterationDelay: number;
  streamsDelay: number;
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

    const numOfAgents = Object.keys(agents).length;

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

    // Swarms to join.
    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic);
    });

    const delayedSwarm = peer.createSwarm(PublicKey.from('delayed'));

    log.info('swarms created', { agentIdx });

    /**
     * Join swarm and wait till all peers are connected.
     */
    const joinSwarm = async (context: Context, swarmIdx: number, swarm: any) => {
      log.info('joining swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await cancelWithContext(context, swarm.join());

      log.info('swarm joined', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await sleep(spec.desiredSwarmTimeout);
      log.info('number of connections within duration', {
        agentIdx,
        swarmIdx,
        swarmTopic: swarm.topic,
        connections: swarm.protocol.connections.size,
        numOfAgents,
      });

      /**
       * Wait till all peers are connected (with timeout).
       */
      const waitTillConnected = async () => {
        await cancelWithContext(
          context,
          swarm.protocol.connected.waitForCondition(
            () => swarm.protocol.connections.size === Object.keys(agents).length - 1,
          ),
        );
        log.info('all peers connected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      };

      asyncTimeout(waitTillConnected(), spec.fullSwarmTimeout).catch((error) => {
        log.info('all peers not connected', {
          agentIdx,
          swarmIdx,
          swarmTopic: swarm.topic,
          connections: swarm.protocol.connections.size,
          numOfAgents,
        });
      });
    };

    /**
     * Leave swarm and wait till all peers are disconnected.
     */
    const leaveSwarm = async (context: Context, swarmIdx: number, swarm: any) => {
      log.info('closing swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await cancelWithContext(context, swarm.leave());
      log.info('swarm closed', { agentIdx, swarmIdx, swarmTopic: swarm.topic });

      /**
       * Wait till all peers are disconnected (with timeout).
       */
      const waitTillDisconnected = async () => {
        await cancelWithContext(
          context,
          swarm.protocol.disconnected.waitForCondition(() => swarm.protocol.connections.size === 0),
        );
        log.info('all peers disconnected', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      };

      asyncTimeout(waitTillDisconnected(), spec.fullSwarmTimeout).catch((error) => {
        log.info('all peers not disconnected', {
          agentIdx,
          swarmIdx,
          swarmTopic: swarm.topic,
          connections: swarm.protocol.connections.size,
        });
      });
    };

    /**
     * Iterate over all swarms and all agents.
     */
    const forEachSwarmAndAgent = async (callback: (swarmIdx: number, swarm: any, agentId: string) => Promise<void>) => {
      await Promise.all(
        Object.keys(env.params.agents)
          .filter((agentId) => agentId !== env.params.agentId)
          .map(async (agentId) => {
            for await (const [swarmIdx, swarm] of swarms.entries()) {
              await callback(swarmIdx, swarm, agentId);
            }
          }),
      );
    };

    const ctx = new Context();
    let testCounter = 0;

    const testRun = async () => {
      const context = ctx.derive({
        onError: (err) => {
          log.info('testRun iterration error', { iterationId: testCounter, err });
        },
      });

      log.info('testRun iteration', { iterationId: testCounter });

      // Join all swarms.
      // How many connections established within the desired duration.
      {
        log.info('joining all swarms', { agentIdx });

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm(context, swarmIdx, swarm);
          }),
        );

        await env.syncBarrier(`swarms are ready on ${testCounter}`);
      }

      await sleep(10_000);

      // Start streams on all swarms.
      {
        log.info('starting streams', { agentIdx });

        // TODO(egorgripasov): Multiply by iterration number.
        const desiredStreems = (numOfAgents - 1) * spec.swarmsPerAgent;
        let actualStreams = 0;

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          log.info('starting stream', { agentIdx, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${env.params.agentId}-${agentId}-${swarmIdx}`;
            await swarm.protocol.startStream(
              PublicKey.from(agentId),
              streamTag,
              spec.streamLoadInterval,
              spec.streamLoadChunkSize,
            );
            actualStreams++;
            log.info('test stream started', { agentIdx, swarmIdx });
          } catch (error) {
            log.info('test stream failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('streams started', { testCounter, agentIdx, desiredStreems, actualStreams });
        await env.syncBarrier(`streams are started at ${testCounter}`);
      }

      await sleep(spec.streamsDelay);

      // Test connections.
      {
        log.info('start testing connections', { agentIdx, testCounter });

        const desiredConnections = (numOfAgents - 1) * spec.swarmsPerAgent;
        let actualConnections = 0;

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          log.info('testing connection', { agentIdx, swarmIdx });
          try {
            await swarm.protocol.testConnection(PublicKey.from(agentId), 'hello world');
            actualConnections++;
            log.info('test connection succeded', { agentIdx, swarmIdx });
          } catch (error) {
            log.info('test connection failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('test connections done', { testCounter, agentIdx, desiredConnections, actualConnections });
        await env.syncBarrier(`connections are tested on ${testCounter}`);
      }

      // Test delayed swarm.
      {
        log.info('testing delayed swarm', { agentIdx, testCounter });
        await joinSwarm(context, swarmTopicIds.length, delayedSwarm);

        await Promise.all(
          Object.keys(env.params.agents)
            .filter((agentId) => agentId !== env.params.agentId)
            .map(async (agentId) => {
              try {
                await delayedSwarm.protocol.testConnection(PublicKey.from(agentId), 'hello world');
              } catch (error) {
                log.info('test delayed swarm failed', { agentIdx, error });
              }
            }),
        );

        await leaveSwarm(context, swarmTopicIds.length, delayedSwarm);

        await env.syncBarrier(`delayed swarm is tested on ${testCounter}`);
      }

      // Close streams.
      {
        log.info('closing streams', { agentIdx });

        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          log.info('closing stream', { agentIdx, swarmIdx });
          try {
            const streamTag = `stream-test-${testCounter}-${env.params.agentId}-${agentId}-${swarmIdx}`;
            const stats = await swarm.protocol.closeStream(PublicKey.from(agentId), streamTag);

            log.info('test stream closed', { agentIdx, swarmIdx, ...stats });
          } catch (error) {
            log.info('test stream closing failed', { agentIdx, swarmIdx, error });
          }
        });

        log.info('streams closed', { testCounter, agentIdx });
        await env.syncBarrier(`streams are closed at ${testCounter}`);
      }

      // Leave all swarms.
      {
        log.info('closing all swarms');

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await leaveSwarm(context, swarmIdx, swarm);
          }),
        );
      }
    };

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
