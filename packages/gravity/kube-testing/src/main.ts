//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import seedrandom from 'seedrandom';

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { Stats, TestBuilder } from './test-builder';

type TestConfig = {
  servers: number;
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

const testConfig: TestConfig = {
  servers: 2,
  agents: 10,
  serversPerAgent: 1,
  topicCount: 1,
  topicsPerAgent: 1,
  discoverTimeout: 5_000,
  repeatInterval: 0,
  duration: 10_000,
  randomSeed: PublicKey.random().toHex(),
  type: 'discovery'
};

seedrandom(testConfig.randomSeed, { global: true });

const setupTest = async (builder: TestBuilder, testConfig: TestConfig, stats: Stats, outFolder: string) => {
  for (const num of range(testConfig.servers)) {
    await builder.createServer(num, outFolder);
  }

  for (const _ of range(testConfig.agents)) {
    const signals = randomArraySlice(
      builder.servers.map((server) => ({
        server: server.url()
      })),
      testConfig.serversPerAgent
    );

    // const signals = [{ server: 'ws://localhost:1337/.well-known/dx/signal'}];

    // NOTE: Opening too many connections too fast causes some of them to be dropped.
    await sleep(5);
    await builder.createPeer({ signals, stats });
  }
};

const randomArraySlice = <T>(array: T[], size: number) => {
  const result = [];
  const arrayCopy = [...array];
  for (let i = 0; i < size; i++) {
    const randomIndex = Math.floor(Math.random() * arrayCopy.length);
    result.push(arrayCopy[randomIndex]);
    arrayCopy.splice(randomIndex, 1);
  }
  return result;
};

const test = async () => {
  const builder = new TestBuilder();
  const stats = new Stats();
  const ctx = new Context();

  const topics = Array.from(range(testConfig.topicCount)).map(() => PublicKey.random());

  const outFolder = `${process.cwd()}/out/results/${new Date().toISOString()}`;

  {
    log.info('Test setup...', testConfig);
    fs.mkdirSync(outFolder, { recursive: true });

    await setupTest(builder, testConfig, stats, outFolder);

    log.info('Test setup complete');
    log.info(
      'Servers',
      builder.servers.map((s) => s.url())
    );
  }

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

      switch (testConfig.type) {
        case 'discovery': {
          for (const peer of builder.peers) {
            for (const topic of randomArraySlice(topics, testConfig.topicsPerAgent)) {
              await cancelWithContext(ctx, peer.joinTopic(topic));
            }
          }

          await Promise.all(
            Array.from(stats.topics.entries()).map(([topic, agents]) =>
              Promise.all(
                Array.from(agents.values()).map((agent) =>
                  cancelWithContext(ctx, agent.discoverPeers(topic, testConfig.discoverTimeout))
                )
              )
            )
          );

          await Promise.all(
            Array.from(stats.topics.entries()).map(([topic, agents]) =>
              Promise.all(Array.from(agents.values()).map((agent) => cancelWithContext(ctx, agent.leaveTopic(topic))))
            )
          );
          break;
        }
        case 'signaling': {
          await Promise.all(builder.peers.map((peer) => peer.sendMessage(randomArraySlice(builder.peers, 1)[0])));
          break;
        }
        default:
          throw new Error(`Unknown test type: ${testConfig.type}`);
      }

      log.info('iteration finished', stats.shortStats);
    },
    testConfig.repeatInterval
  );

  await sleep(testConfig.duration);

  //
  // cleanup
  //
  {
    stats.finishTest();
    await ctx.dispose();
    await builder.destroy();
  }

  //
  // results
  //
  {
    log.info('Short stats', stats.shortStats);
    const fileName = `${outFolder}/stats.json`;
    fs.writeFileSync(
      fileName,
      JSON.stringify({ testConfig, shortStats: stats.shortStats, stats: stats.performance }, null, 2)
    );
    log.info('Stats written to file', { fileName });
    console.log(`stats file: ${fileName}`);
  }
};

test()
  .then(() => log.info('Done'))
  .catch((e) => log.catch(e));
