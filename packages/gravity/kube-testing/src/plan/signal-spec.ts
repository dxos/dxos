//
// Copyright 2023 DXOS.org
//

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';
import { LogReader, SerializedLogEntry, TraceEvent } from '../analysys/reducer';
import * as dfd from 'danfojs-node'

import { Stats, TestBuilder } from '../test-builder';
import { randomArraySlice } from '../util';
import { AgentParams, PlanResults, TestParams, TestPlan } from './spec-base';

export type SignalTestSpec = {
  servers: number;
  serverOverride?: string;

  agents: number;
  serversPerAgent: number;
  topicCount: number;
  topicsPerAgent: number;
  discoverTimeout: number;
  repeatInterval: number;
  duration: number;
  randomSeed: string;
  type: 'discovery' | 'signaling';
};

export type SignalAgentConfig = {
  servers: string[];
  topics: string[];
};

export class SignalTestPlan implements TestPlan<SignalTestSpec, SignalAgentConfig> {
  builder = new TestBuilder();

  async configurePlan({ spec, outDir }: TestParams<SignalTestSpec>): Promise<SignalAgentConfig[]> {
    for (const num of range(spec.servers)) {
      await this.builder.createServer(num, outDir);
    }

    const topics = Array.from(range(spec.topicCount)).map(() => PublicKey.random());

    return range(spec.agents).map((): SignalAgentConfig => {
      const servers = spec.serverOverride 
      ? [spec.serverOverride] : randomArraySlice(
        this.builder.servers.map((server) => server.url()),
        spec.serversPerAgent
      );

      // const signals = [{ server: 'ws://localhost:1337/.well-known/dx/signal'}];

      return {
        servers,
        topics: randomArraySlice(topics, spec.topicsPerAgent).map((topic) => topic.toHex())
      };
    });
  }

  async agentMain({
    agentId,
    agents,
    spec,
    config,
    outDir
  }: AgentParams<SignalTestSpec, SignalAgentConfig>): Promise<void> {
    const ctx = new Context();
    const stats = new Stats();

    log.info('start', { agentId });

    const topics = config.topics.map((topic) => PublicKey.from(topic));
    const agentsPerTopic: Record<string, string[]> = {};
    for (const [agentId, agentCfg] of Object.entries(agents)) {
      for (const topic of agentCfg.topics) {
        agentsPerTopic[agentId] ??= [];
        agentsPerTopic[agentId].push(topic);
      }
    }

    const agent = await this.builder.createPeer({
      signals: config.servers.map((server) => ({ server })),
      stats,
      peerId: PublicKey.from(agentId),
    });
    // NOTE: Sometimes first message is not dropped if it is sent too soon.
    await sleep(1_000);

    //
    // test
    //
    let testCounter = 0;
    scheduleTaskInterval(
      ctx,
      async () => {
        log.info(`${testCounter++} test iteration running...`);

        switch (spec.type) {
          case 'discovery': {
            for (const topic of topics) {
              await cancelWithContext(ctx, agent.joinTopic(PublicKey.from(topic)));
            }

            await sleep(spec.discoverTimeout);

            // await Promise.all(topics.map((topic) =>
            //   cancelWithContext(ctx, agent.discoverPeers(PublicKey.from(topic), spec.discoverTimeout))
            // ));

            await Promise.all(topics.map((topic) => cancelWithContext(ctx, agent.leaveTopic(PublicKey.from(topic)))));
            break;
          }
          case 'signaling': {
            agent.sendMessage(PublicKey.from(randomArraySlice(Object.keys(agents), 1)[0]))
            break;
          }
          default:
            throw new Error(`Unknown test type: ${spec.type}`);
        }

        log.info('iteration finished', stats.shortStats);
      },
      spec.repeatInterval
    );

    await sleep(spec.duration);
  }

  async finishPlan(results: PlanResults): Promise<void> {
    // log.info('finishPlan', { results })
    await this.builder.destroy();

    // const reader = new LogReader();
    // for(const { logFile } of Object.values(results.agents)) {
    //   console.log('add', { logFile })
    //   reader.addFile(logFile)
    // }

    // const messages = new Map<string, { sent: number, received: number }>();

    // for await(const entry of reader) {
    //   if(entry.message !== 'dxos.test.signal') {
    //     continue;
    //   }
    //   const data: TraceEvent = entry.context;

    //   switch(data.type) {
    //     case 'SENT_MESSAGE':
    //       if(!messages.has(data.message)) {
    //         messages.set(data.message, { sent: 0, received: 0})
    //       }
    //       messages.get(data.message)!.sent = entry.timestamp;
    //       break;
    //     case 'RECEIVE_MESSAGE':
    //       if(!messages.has(data.message)) {
    //         messages.set(data.message, { sent: 0, received: 0})
    //       }
    //       messages.get(data.message)!.received = entry.timestamp;
    //       break;
    //   }
    // }

    // const lagTimes = new dfd.Series(Array.from(messages.values()).map(x => x.received - x.sent))

    // console.log(messages)
  }
}
