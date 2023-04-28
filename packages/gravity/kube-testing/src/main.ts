//
// Copyright 2023 DXOS.org
//

import seedrandom from 'seedrandom';

import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { range } from '@dxos/util';

import { Stats, TestBuilder } from './test-builder';

type TestConfig = {
  servers: number;
  agents: number;
  serversPerAgent: number;
  topics: PublicKey[];
  topicsPerAgent: number;
  randomSeed: string;
};

const testConfig = {
  servers: 1,
  agents: 2,
  serversPerAgent: 1,
  topics: [PublicKey.random()],
  topicsPerAgent: 1,
  randomSeed: PublicKey.random().toHex()
};

seedrandom(testConfig.randomSeed, { global: true });

const setupTest = async (builder: TestBuilder, testConfig: TestConfig, stats: Stats) => {
  for (const _ of range(testConfig.servers)) {
    await builder.createServer();
  }

  for (const _ of range(testConfig.agents)) {
    const signals = randomArraySlice(
      builder.servers.map((server) => ({
        server: server.url()
      })),
      testConfig.serversPerAgent
    );
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

  await setupTest(builder, testConfig, stats);
  log.info('Test setup complete');
  log.info(
    'Servers',
    builder.servers.map((s) => s.url())
  );

  for (const peer of builder.peers) {
    for (const topic of randomArraySlice(testConfig.topics, testConfig.topicsPerAgent)) {
      await peer.joinTopic(topic);
    }
  }

  await Promise.all(
    Array.from(stats.topics.entries()).map(([topic, agents]) =>
      Promise.all(Array.from(agents.values()).map((agent) => agent.discoverPeers(topic)))
    )
  );
  
  await builder.destroy();

  log.info('Test config', testConfig);
  log.info('Stats', stats.performance);
};

test()
  .then(() => log.info('Done'))
  .catch((e) => log.catch(e));
