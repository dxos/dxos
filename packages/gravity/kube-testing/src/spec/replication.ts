//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { sleep, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedFactory, FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { Keyring, TestKeyPair, generateKeyPair } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TestBuilder as NetworkManagerTestBuilder } from '@dxos/network-manager/testing';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { ReplicatorExtension } from '@dxos/teleport-extension-replicator';
import { range } from '@dxos/util';

import { SerializedLogEntry, getReader } from '../analysys';
import { PlanResults, TestParams, TestPlan, AgentEnv } from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { forEachSwarmAndAgent, joinSwarm, leaveSwarm } from './util';

const REPLICATOR_EXTENSION_NAME = 'replicator';

type FeedConfig = {
  feedKey: string;
  writable: boolean;
};

type FeedEntry = {
  agentIdx: number;
  swarmIdx: number;
  feedLength: number;
  byteLength: number;
  writable: boolean;
  feedKey: string;
};

type FeedReplicaStats = {
  feedLength: number;
  byteLength: number;
  replicationSpeed?: string;
};

type FeedStats = {
  feedKey: string;
  feedLength: number;
  byteLength: number;
  replicas: FeedReplicaStats[];
};

export type ReplicationTestSpec = {
  agents: number;
  swarmsPerAgent: number;
  duration: number;

  transport: 'webrtc' | 'webrtc-proxy';

  targetSwarmTimeout: number;
  fullSwarmTimeout: number;

  feedsPerSwarm: number;
  feedLoadInterval: number;
  feedLoadChunkSize: number;
  feedLoadDuration: number;

  repeatInterval: number;

  signalArguments: string[];
};

export type ReplicationAgentConfig = {
  agentIdx: number;
  signalUrl: string;
  swarmTopicIds: string[];
  feeds: Record<string, FeedConfig[]>;
  feedKeys: TestKeyPair[];
};

/**
 * Replication test plan uses ReplicationExtension to measure replication speed by writing to feeds
 * and measuring the time it takes for the data to be replicated to other agents. Real network stack
 * is used for this test, incl. Teleport & real WebRTC connections.
 */
export class ReplicationTestPlan implements TestPlan<ReplicationTestSpec, ReplicationAgentConfig> {
  signalBuilder = new SignalTestBuilder();

  async init({ spec, outDir }: TestParams<ReplicationTestSpec>): Promise<ReplicationAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

    const swarmTopicIds = range(spec.swarmsPerAgent).map(() => PublicKey.random().toHex());

    const feeds = new Map<number, Map<string, FeedConfig[]>>();
    const feedKeys: TestKeyPair[] = [];

    range(spec.agents).forEach((agentIdx) => {
      feeds.set(agentIdx, new Map(swarmTopicIds.map((id) => [id, []])));
    });

    const addFeedConfig = async (agentIdx: number, swarmTopicId: string) => {
      const feedKey = await generateKeyPair();
      feedKeys.push(feedKey);
      for (const [currentAgentIdx, agentFeeds] of feeds.entries()) {
        agentFeeds.get(swarmTopicId)!.push({ feedKey: feedKey.publicKeyHex, writable: currentAgentIdx === agentIdx });
      }
    };

    // Add spec.feedsPerSwarm feeds for each agent to each swarm.
    range(spec.agents).forEach(async (agentIdx) => {
      swarmTopicIds.forEach(async (swarmTopicId) => {
        range(spec.feedsPerSwarm).forEach(async () => {
          await addFeedConfig(agentIdx, swarmTopicId);
        });
      });
    });

    return range(spec.agents).map((agentIdx) => {
      return {
        agentIdx,
        signalUrl: signal.url(),
        swarmTopicIds,
        feeds: Object.fromEntries(feeds.get(agentIdx)!.entries()),
        feedKeys,
      };
    });
  }

  async run(env: AgentEnv<ReplicationTestSpec, ReplicationAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
    const { agentIdx, swarmTopicIds, signalUrl, feeds: feedsSpec, feedKeys } = config;

    const numAgents = Object.keys(agents).length;

    log.info('run', {
      agentIdx,
      runnerAgentIdx: config.agentIdx,
      agentId: env.params.agentId.substring(0, 8),
    });

    // Feeds.
    const storage = createStorage({ type: StorageType.RAM });
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore({
      factory: new FeedFactory({ root: storage.createDirectory('feeds'), signer: keyring }),
    });

    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
      bridge: spec.transport === 'webrtc-proxy',
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(env.params.agentId));
    await peer.open();
    log.info('peer created', { agentIdx });

    log.info(`creating ${swarmTopicIds.length} swarms`, { agentIdx });

    const feeds = new Map<string, { writable: boolean; feed: FeedWrapper<any> }[]>();

    // Feeds.
    for (const [swarmTopicId, feedConfigs] of Object.entries(feedsSpec)) {
      const feedsArr = [];
      for (const feedConfig of feedConfigs) {
        // Import key pairs to keyring.
        const keyPairExported = feedKeys.find((k) => k.publicKeyHex === feedConfig.feedKey)!;
        const feedKey = await keyring._importKeyPair(keyPairExported.privateKey, keyPairExported.publicKey);

        const feed = await feedStore.openFeed(feedKey, { writable: feedConfig.writable });
        feedsArr.push({ feed, writable: feedConfig.writable });
      }
      feeds.set(swarmTopicId, feedsArr);
    }

    // Swarms to join.
    const swarms = swarmTopicIds.map((swarmTopicId, swarmIdx) => {
      const swarmTopic = PublicKey.from(swarmTopicId);
      return peer.createSwarm(swarmTopic, () => [
        { name: REPLICATOR_EXTENSION_NAME, extension: new ReplicatorExtension().setOptions({ upload: true }) },
      ]);
    });

    log.info('swarms created', { agentIdx });

    const loadFeed = (
      context: Context,
      feed: FeedWrapper<any>,
      options: { feedLoadInterval: number; feedLoadChunkSize: number },
    ) => {
      const { feedLoadInterval, feedLoadChunkSize } = options;

      scheduleTaskInterval(
        context,
        async () => {
          await feed.append(randomBytes(feedLoadChunkSize));
        },
        feedLoadInterval,
      );
    };

    const ctx = new Context();
    const testCounter = 0;

    const testRun = async () => {
      const context = ctx.derive({
        onError: (err) => {
          log.info('testRun iterration error', { iterationId: testCounter, err });
        },
      });

      log.info('testRun iteration', { iterationId: testCounter });

      // Join all swarms.
      // How many connections established within the target duration.
      {
        log.info('joining all swarms', { agentIdx });

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm({
              context,
              swarmIdx,
              agentIdx,
              numAgents,
              targetSwarmTimeout: spec.targetSwarmTimeout,
              fullSwarmTimeout: spec.fullSwarmTimeout,
              swarm,
            });
          }),
        );

        await env.syncBarrier(`swarms are ready on ${testCounter}`);
      }

      await sleep(5_000);

      // Add feeds.
      {
        log.info('adding feeds', { agentIdx });
        await forEachSwarmAndAgent(
          env.params.agentId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, agentId) => {
            const connection = swarm.protocol.otherConnections.get({
              remotePeerId: PublicKey.from(agentId),
              extension: REPLICATOR_EXTENSION_NAME,
            }) as ReplicatorExtension;
            const feedsArr = feeds.get(swarm.topic.toString())!;
            for (const feedObj of feedsArr) {
              await connection.addFeed(feedObj.feed);
            }
          },
        );

        await sleep(5_000);

        await env.syncBarrier(`feeds are added on ${testCounter}`);
      }

      // Write to writable feeds in all swarms.
      {
        const subctx = context.derive({
          onError: (err) => {
            log.info('write to writable feeds error', { iterationId: testCounter, err });
          },
        });

        log.info('writing to writable feeds', { agentIdx });
        await forEachSwarmAndAgent(
          env.params.agentId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, agentId) => {
            const feedsArr = feeds.get(swarm.topic.toString())!;
            for (const feedObj of feedsArr) {
              if (feedObj.writable) {
                loadFeed(context, feedObj.feed, {
                  feedLoadInterval: spec.feedLoadInterval,
                  feedLoadChunkSize: spec.feedLoadChunkSize,
                });
              }
            }
          },
        );

        await sleep(spec.feedLoadDuration);
        await subctx.dispose();

        await env.syncBarrier(`feeds are written on ${testCounter}`);
      }

      // Check length of all feeds.
      {
        log.info('checking feeds length', { agentIdx });
        await forEachSwarmAndAgent(
          env.params.agentId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, agentId) => {
            const feedsArr = feeds.get(swarm.topic.toString())!;
            for (const feedObj of feedsArr) {
              log.trace('dxos.test.feed-stats', {
                agentIdx,
                swarmIdx,
                feedLength: feedObj.feed.length,
                byteLength: feedObj.feed.byteLength,
                writable: feedObj.writable,
                feedKey: feedObj.feed.key.toString(),
              });
            }
          },
        );
      }

      await sleep(5_000);

      // Leave all swarms.
      {
        log.info('closing all swarms');

        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await leaveSwarm({ context, swarmIdx, swarm, agentIdx, fullSwarmTimeout: spec.fullSwarmTimeout });
          }),
        );
      }
    };

    await testRun();

    // scheduleTaskInterval(
    //   ctx,
    //   async () => {
    //     await env.syncBarrier(`iteration-${testCounter}`);
    //     await asyncTimeout(testRun(), spec.duration);
    //     testCounter++;
    //   },
    //   spec.repeatInterval,
    // );
    // await sleep(spec.duration);
    // await ctx.dispose();

    log.info('test completed', { agentIdx });
  }

  async finish(params: TestParams<ReplicationTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
    log.info('finished shutdown');

    // Map<agentIdx, Map<swarmId, FeedStats>>
    const feeds = new Map<number, Map<number, FeedEntry[]>>();

    range(params.spec.agents).forEach((agentIdx) => {
      feeds.set(agentIdx, new Map(range(params.spec.swarmsPerAgent).map((idx) => [idx, []])));
    });

    const reader = getReader(results);

    reader.forEach((entry: SerializedLogEntry<any>) => {
      switch (entry.message) {
        case 'dxos.test.feed-stats': {
          const feedStats = entry.context as FeedEntry;
          const agentFeeds = feeds.get(entry.context.agentIdx)!;
          const swarmFeeds = agentFeeds.get(entry.context.swarmIdx)!;
          // TODO(egorgripasov): For some reason received logs entry are duplicated.
          if (!swarmFeeds.find((feed) => feed.feedKey === feedStats.feedKey)) {
            swarmFeeds.push(feedStats);
          }
          break;
        }
      }
    });

    const stats: FeedStats[] = [];
    feeds.forEach((agentFeeds, agentIdx) => {
      agentFeeds.forEach((swarmFeeds, swarmIdx) => {
        swarmFeeds.forEach((feedStats) => {
          if (feedStats.writable) {
            const replicas: FeedReplicaStats[] = [];
            // Check feeds from other agents from this swarm.
            feeds.forEach((otherAgentFeeds, otherAgentIdx) => {
              if (otherAgentIdx !== agentIdx) {
                const otherSwarmFeeds = otherAgentFeeds.get(swarmIdx)!;
                const otherFeedStats = otherSwarmFeeds.find(
                  (otherFeedStats) => otherFeedStats.feedKey === feedStats.feedKey,
                );
                if (otherFeedStats) {
                  const bytesInSecond = otherFeedStats.byteLength / (params.spec.feedLoadDuration / 1000)
                  const e = Math.floor(Math.log(bytesInSecond) / Math.log(1024));
                  replicas.push({
                    feedLength: otherFeedStats.feedLength,
                    byteLength: otherFeedStats.byteLength,
                    replicationSpeed: (bytesInSecond / Math.pow(1024, e)).toFixed(2) + ' ' + ' kMGTP'.charAt(e) + 'B/sec',
                  });
                }
              }
            });
            stats.push({
              feedKey: feedStats.feedKey,
              feedLength: feedStats.feedLength,
              byteLength: feedStats.byteLength,
              replicas,
            });
          }
        });
      });
    });

    log.info('replication stats', { stats });
  }
}
