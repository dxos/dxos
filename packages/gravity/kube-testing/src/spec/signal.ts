//
// Copyright 2023 DXOS.org
//

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { checkType } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { TraceEvent, analyzeMessages, analyzeSwarmEvents } from '../analysys';
import { AgentEnv, PlanResults, TestParams, TestPlan } from '../plan';
import { TestPeer, TestBuilder } from '../test-builder';
import { randomArraySlice } from '../util';

export type SignalTestSpec = {
  servers: number;
  serverOverride?: string;
  signalArguments: string[];

  agents: number;
  peersPerAgent: number;
  serversPerAgent: number;

  type: 'discovery' | 'signaling';
  topicCount: number;
  topicsPerAgent: number;

  /**
   * Time to allow everything to init. NOTE: Sometimes first message is not dropped if it is sent too soon.
   */
  startWaitTime: number;
  discoverTimeout: number;
  repeatInterval: number;
  agentWaitTime: number;
  duration: number;
};

export type SignalAgentConfig = {
  servers: string[];
  topics: string[];
};

export class SignalTestPlan implements TestPlan<SignalTestSpec, SignalAgentConfig> {
  builder = new TestBuilder();

  async init({ spec, outDir }: TestParams<SignalTestSpec>): Promise<SignalAgentConfig[]> {
    await Promise.all(range(spec.servers).map((num) => this.builder.createServer(num, outDir, spec.signalArguments)));

    const topics = Array.from(range(spec.topicCount)).map(() => PublicKey.random());

    return range(spec.agents).map((): SignalAgentConfig => {
      const servers = spec.serverOverride
        ? [spec.serverOverride]
        : randomArraySlice(
            this.builder.servers.map((server) => server.url()),
            spec.serversPerAgent,
          );

      return {
        servers,
        topics: randomArraySlice(topics, spec.topicsPerAgent).map((topic) => topic.toHex()),
      };
    });
  }

  async run(env: AgentEnv<SignalTestSpec, SignalAgentConfig>): Promise<void> {
    const { agentId, agents, spec, config } = env.params;
    log.info('start', { agentId });

    const ctx = new Context();
    let testCounter = 0;

    const peers = await Promise.all(
      range(spec.peersPerAgent).map(() =>
        this.builder.createPeer({
          signals: config.servers.map((server) => ({ server })),
          peerId: PublicKey.random(),
        }),
      ),
    );

    const testRun = async (peer: TestPeer) => {
      log.info(`${testCounter} test iteration running...`);

      const context = ctx.derive({
        onError: (err) => {
          log.trace(
            'dxos.test.signal.context.onError',
            checkType<TraceEvent>({
              type: 'ITERATION_ERROR',
              err: {
                name: err.name,
                message: err.message,
                stack: err.stack,
              },
              peerId: peer.peerId.toHex(),
              iterationId: testCounter,
            }),
          );
        },
      });

      log.trace(
        'dxos.test.signal.iteration.start',
        checkType<TraceEvent>({
          type: 'ITERATION_START',
          peerId: peer.peerId.toHex(),
          iterationId: testCounter,
        }),
      );

      switch (spec.type) {
        case 'discovery': {
          peer.regeneratePeerId();
          const topics = config.topics.map((topic) => PublicKey.from(topic));
          for (const topic of topics) {
            await cancelWithContext(context, peer.joinTopic(PublicKey.from(topic)));
          }

          await sleep(spec.discoverTimeout);

          await Promise.all(topics.map((topic) => cancelWithContext(context, peer.leaveTopic(PublicKey.from(topic)))));
          break;
        }
        case 'signaling': {
          await cancelWithContext(
            context,
            peer.sendMessage(PublicKey.from(randomArraySlice(Object.keys(agents), 1)[0])),
          );
          break;
        }
        default:
          throw new Error(`Unknown test type: ${spec.type}`);
      }

      log.info('iteration finished');
    };

    scheduleTaskInterval(
      ctx,
      async () => {
        await env.syncBarrier(`iteration-${testCounter}`);
        await cancelWithContext(ctx, Promise.all(peers.map((peer) => testRun(peer))));
        testCounter++;
      },
      spec.repeatInterval,
    );

    await sleep(spec.duration);
    await ctx.dispose();
    await sleep(spec.agentWaitTime);
  }

  async finish(params: TestParams<SignalTestSpec>, results: PlanResults): Promise<any> {
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
