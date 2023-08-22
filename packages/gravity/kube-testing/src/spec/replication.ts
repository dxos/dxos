//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { asyncTimeout, sleep, scheduleTaskInterval } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { FeedFactory, FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { Keyring, TestKeyPair, generateKeyPair } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TestBuilder as NetworkManagerTestBuilder, TestSwarmConnection } from '@dxos/network-manager/testing';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { ReplicatorExtension } from '@dxos/teleport-extension-replicator';
import { range } from '@dxos/util';

import { SerializedLogEntry, getReader } from '../analysys';
import { PlanResults, TestParams, TestPlan, AgentEnv } from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

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

    /**
     * Join swarm and wait till all peers are connected.
     */
    // TODO(egorgripasov): Move to util.
    const joinSwarm = async (context: Context, swarmIdx: number, swarm: any) => {
      log.info('joining swarm', { agentIdx, swarmIdx, swarmTopic: swarm.topic });
      await cancelWithContext(context, swarm.join());

      log.info('swarm joined', { agentIdx, swarmIdx, swarmTopic: swarm.topic });

      await sleep(spec.targetSwarmTimeout);

      log.info('number of connections within duration', {
        agentIdx,
        swarmIdx,
        swarmTopic: swarm.topic,
        connections: swarm.protocol.connections.size,
        numAgents,
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
          numAgents,
        });
      });
    };

    /**
     * Leave swarm and wait till all peers are disconnected.
     */
    // TODO(egorgripasov): Move to util.
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
    // TODO(egorgripasov): Move to util.
    const forEachSwarmAndAgent = async (
      callback: (swarmIdx: number, swarm: TestSwarmConnection, agentId: string) => Promise<void>,
    ) => {
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

    const loadFeed = async (
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
            await joinSwarm(context, swarmIdx, swarm);
          }),
        );

        await env.syncBarrier(`swarms are ready on ${testCounter}`);
      }

      await sleep(5_000);

      // Add feeds.
      {
        log.info('adding feeds', { agentIdx });
        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          const connection = swarm.protocol.otherConnections.get({
            remotePeerId: PublicKey.from(agentId),
            extension: REPLICATOR_EXTENSION_NAME,
          }) as ReplicatorExtension;
          const feedsArr = feeds.get(swarm.topic.toString())!;
          for (const feedObj of feedsArr) {
            await connection.addFeed(feedObj.feed);
          }
        });

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
        const loadPromises: Promise<void>[] = [];
        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
          const feedsArr = feeds.get(swarm.topic.toString())!;
          for (const feedObj of feedsArr) {
            if (feedObj.writable) {
              loadPromises.push(
                loadFeed(context, feedObj.feed, {
                  feedLoadInterval: spec.feedLoadInterval,
                  feedLoadChunkSize: spec.feedLoadChunkSize,
                }),
              );
            }
          }
        });

        await sleep(spec.feedLoadDuration);
        await env.syncBarrier(`feeds are written on ${testCounter}`);

        await subctx.dispose();
      }

      // Check length of all feeds.
      {
        log.info('checking feeds length', { agentIdx });
        await forEachSwarmAndAgent(async (swarmIdx, swarm, agentId) => {
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
        });
      }

      await sleep(5_000);

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
          swarmFeeds.push(feedStats);
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
                  replicas.push({
                    feedLength: otherFeedStats.feedLength,
                    byteLength: otherFeedStats.byteLength,
                    replicationSpeed: `${(
                      otherFeedStats.byteLength /
                      (params.spec.feedLoadDuration / 1000) /
                      1_000_000
                    ).toFixed(2)} MB/s`,
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
