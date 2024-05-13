//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { sleep, scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { FeedFactory, FeedStore, type FeedWrapper } from '@dxos/feed-store';
import { Keyring, type TestKeyPair, generateJWKKeyPair, parseJWKKeyPair } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TransportKind } from '@dxos/network-manager';
import { TestBuilder as NetworkManagerTestBuilder } from '@dxos/network-manager/testing';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { ReplicatorExtension } from '@dxos/teleport-extension-replicator';
import { range } from '@dxos/util';

import { forEachSwarmAndAgent, joinSwarm, leaveSwarm } from './util';
import { type SerializedLogEntry, getReader } from '../analysys';
import { type PlanResults, type TestParams, type TestPlan, type AgentEnv, type ReplicantRunOptions } from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

const REPLICATOR_EXTENSION_NAME = 'replicator';

type FeedConfig = {
  feedKey: string; // TODO(burdon): Why not PublicKey?
  writable: boolean;
};

type FeedEntry = {
  replicantId: number; // TODO(burdon): Use key to index?
  swarmIdx: number;
  feedLength: number;
  byteLength: number;
  writable: boolean;
  feedKey: string; // TODO(burdon): Key?
  testCounter: number;
};

type FeedLoadTimeEntry = {
  replicantId: number;
  testCounter: number;
  feedLoadTime: number;
};

type FeedReplicaStats = {
  feedLength: number;
  byteLength: number;
  replicationSpeed?: string; // TODO(burdon): Keep as number and format on demand.
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
  transport: TransportKind;

  targetSwarmTimeout: number;
  fullSwarmTimeout: number;
  feedsPerSwarm: number;
  feedAppendInterval: number;
  feedMessageSize: number;
  feedLoadDuration?: number;
  feedMessageCount?: number;
  repeatInterval: number;
  signalArguments: string[];
};

// Note: must be serializable.
export type ReplicationAgentConfig = {
  replicantId: number;
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
  onError?: (err: Error) => void;

  defaultSpec(): ReplicationTestSpec {
    return {
      agents: 2,
      swarmsPerAgent: 1,
      duration: 3_000,
      transport: TransportKind.SIMPLE_PEER_PROXY,
      targetSwarmTimeout: 1_000,
      fullSwarmTimeout: 10_000,
      signalArguments: ['globalsubserver'],
      repeatInterval: 100,
      feedsPerSwarm: 1,
      feedAppendInterval: 0,
      feedMessageSize: 500,
      // feedLoadDuration: 10_000,
      feedMessageCount: 5_000,
    };
  }

  async init({ spec, outDir }: TestParams<ReplicationTestSpec>): Promise<ReplicantRunOptions<ReplicationAgentConfig>[]> {
    if (!!spec.feedLoadDuration === !!spec.feedMessageCount) {
      throw new Error('Only one of feedLoadDuration or feedMessageCount must be set.');
    }

    const signal = await this.signalBuilder.createSignalServer(0, outDir, spec.signalArguments, (err) => {
      log.error('error in signal server', { err });
      this.onError?.(err);
    });

    const swarmTopicsIds = range(spec.swarmsPerAgent).map(() => PublicKey.random());
    const feedsBySwarm = new Map<number, Map<PublicKey, FeedConfig[]>>();
    range(spec.agents).forEach((replicantId) => {
      feedsBySwarm.set(replicantId, new Map(swarmTopicsIds.map((id) => [id, []])));
    });

    const feedKeys: TestKeyPair[] = [];
    const addFeedConfig = async (replicantId: number, swarmTopicId: PublicKey) => {
      const feedKey = await generateJWKKeyPair();
      feedKeys.push(feedKey);
      for (const [currentAgentIdx, agentFeeds] of feedsBySwarm.entries()) {
        agentFeeds.get(swarmTopicId)!.push({ feedKey: feedKey.publicKeyHex, writable: currentAgentIdx === replicantId });
      }
    };

    // Add spec.feedsPerSwarm feeds for each agent to each swarm.
    await Promise.all(
      range(spec.agents).map(async (replicantId) => {
        await Promise.all(
          swarmTopicsIds.map(async (swarmTopicId) => {
            await Promise.all(
              range(spec.feedsPerSwarm).map(async () => {
                await addFeedConfig(replicantId, swarmTopicId);
              }),
            );
          }),
        );
      }),
    );

    return range(spec.agents).map((replicantId) => {
      return {
        config: {
          replicantId,
          signalUrl: signal.url(),
          swarmTopicIds: swarmTopicsIds.map((key) => key.toHex()),
          feeds: Object.fromEntries(feedsBySwarm.get(replicantId)!.entries()),
          feedKeys,
        },
      };
    });
  }

  async run(env: AgentEnv<ReplicationTestSpec, ReplicationAgentConfig>): Promise<void> {
    const { config, spec, agents } = env.params;
    const { replicantId, swarmTopicIds, signalUrl, feeds: feedsSpec, feedKeys } = config;

    const numAgents = Object.keys(agents).length;
    log.info('run', {
      replicantId,
    });

    // Feeds.
    // TODO(burdon): Config for storage type.
    // TODO(burdon): Use @dxos/feed-store TestBuilder?
    const storage = createStorage({ type: StorageType.NODE });
    const keyring = new Keyring(storage.createDirectory('keyring'));
    const feedStore = new FeedStore({
      factory: new FeedFactory({ root: storage.createDirectory('feeds'), signer: keyring }),
    });

    const networkManagerBuilder = new NetworkManagerTestBuilder({
      signalHosts: [{ server: signalUrl }],
      transport: spec.transport,
    });

    const peer = networkManagerBuilder.createPeer(PublicKey.from(env.params.replicantId));
    await peer.open();
    log.info('peer created', { replicantId });

    // Feeds.
    const feedsBySwarm = new Map<string, { writable: boolean; feed: FeedWrapper<any> }[]>();
    for (const [swarmTopicId, feedConfigs] of Object.entries(feedsSpec)) {
      const feedsArr = await Promise.all(
        feedConfigs.map(async (feedConfig) => {
          // Import key pairs to keyring.
          // TODO(burdon): Can these just be created by the keyring?
          const keyPairExported = feedKeys.find((key) => key.publicKeyHex === feedConfig.feedKey)!;
          const feedKey = await keyring.importKeyPair(
            await parseJWKKeyPair(keyPairExported.privateKey, keyPairExported.publicKey),
          );

          const feed: FeedWrapper<any> = await feedStore.openFeed(feedKey, { writable: feedConfig.writable });
          return { feed, writable: feedConfig.writable };
        }),
      );

      feedsBySwarm.set(swarmTopicId, feedsArr);
    }

    // Swarms to join.
    log.info(`creating ${swarmTopicIds.length} swarms`, { replicantId });
    const swarms = swarmTopicIds.map((swarmTopicId) => {
      return peer.createSwarm(PublicKey.from(swarmTopicId), () => [
        { name: REPLICATOR_EXTENSION_NAME, extension: new ReplicatorExtension().setOptions({ upload: true }) },
      ]);
    });

    const loadFeed = async (
      context: Context,
      feed: FeedWrapper<any>,
      options: {
        feedAppendInterval: number;
        feedMessageSize: number;
        feedLoadDuration?: number;
        feedMessageCount?: number;
      },
    ) => {
      const { feedAppendInterval, feedMessageSize, feedLoadDuration, feedMessageCount } = options;
      if (feedLoadDuration) {
        scheduleTaskInterval(
          context,
          async () => {
            await feed.append(randomBytes(feedMessageSize));
          },
          feedAppendInterval,
        );
      } else {
        for (let i = 0; i < feedMessageCount!; i++) {
          await feed.append(randomBytes(feedMessageSize));
        }
      }
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
        log.info('joining all swarms', { replicantId });
        await Promise.all(
          swarms.map(async (swarm, swarmIdx) => {
            await joinSwarm({
              context,
              swarmIdx,
              replicantId,
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
        log.info('adding feeds', { replicantId });
        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            const connection = swarm.protocol.otherConnections.get({
              remotePeerId: PublicKey.from(replicantId),
              extension: REPLICATOR_EXTENSION_NAME,
            }) as ReplicatorExtension;
            const feedsArr = feedsBySwarm.get(swarm.topic.toHex())!;
            for (const feedObj of feedsArr) {
              connection.addFeed(feedObj.feed);
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

        log.info('writing to writable feeds', { replicantId });
        const loadTasks: Promise<void>[] = [];

        const timeBeforeLoadStarts = Date.now();
        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            const feedsArr = feedsBySwarm.get(swarm.topic.toHex())!;
            for (const feedObj of feedsArr) {
              if (feedObj.writable) {
                const loadPromise = loadFeed(context, feedObj.feed, {
                  feedMessageCount: spec.feedMessageCount,
                  feedLoadDuration: spec.feedLoadDuration,
                  feedAppendInterval: spec.feedAppendInterval,
                  feedMessageSize: spec.feedMessageSize,
                });
                loadTasks.push(loadPromise);
              }
            }
          },
        );

        await Promise.all(loadTasks);

        if (spec.feedLoadDuration) {
          await sleep(spec.feedLoadDuration);
        }

        await subctx.dispose();

        log.trace('dxos.test.feed-load-time', {
          replicantId,
          testCounter,
          feedLoadTime: Date.now() - timeBeforeLoadStarts,
        });

        await env.syncBarrier(`feeds are written on ${testCounter}`);
      }

      // Check length of all feeds.
      {
        log.info('checking feeds length', { replicantId });
        await forEachSwarmAndAgent(
          env.params.replicantId,
          Object.keys(env.params.agents),
          swarms,
          async (swarmIdx, swarm, replicantId) => {
            const feedsArr = feedsBySwarm.get(swarm.topic.toHex())!;
            for (const feedObj of feedsArr) {
              log.trace('dxos.test.feed-stats', {
                replicantId,
                swarmIdx,
                feedLength: feedObj.feed.length,
                byteLength: feedObj.feed.byteLength,
                writable: feedObj.writable,
                feedKey: feedObj.feed.key.toHex(),
                testCounter,
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
            await leaveSwarm({ context, swarmIdx, swarm, replicantId, fullSwarmTimeout: spec.fullSwarmTimeout });
          }),
        );
      }
    };

    await testRun();

    // TODO(egorgripasov): Evaluate if we need to make multiple test runs.
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

    log.info('test completed', { replicantId });
  }

  async finish(params: TestParams<ReplicationTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();

    // Map<replicantId, Map<swarmId, FeedStats>>
    const swarmsByAgent = new Map<number, Map<number, FeedEntry[]>>();
    range(params.spec.agents).forEach((replicantId) => {
      swarmsByAgent.set(replicantId, new Map(range(params.spec.swarmsPerAgent).map((idx) => [idx, []])));
    });

    // Map<replicantId, ms>
    const feedLoadTimes = new Map<number, number>();

    const reader = getReader(results);
    reader.forEach((entry: SerializedLogEntry<any>) => {
      switch (entry.message) {
        case 'dxos.test.feed-stats': {
          const feedStats = entry.context as FeedEntry;
          // TODO(egorgripasov): Evaluate if we need to make multiple test runs.
          if (feedStats.testCounter > 0) {
            break;
          }

          const agentFeeds = swarmsByAgent.get(entry.context.replicantId)!;
          const swarmFeeds = agentFeeds.get(entry.context.swarmIdx)!;
          // TODO(egorgripasov): For some reason received logs entry are duplicated.
          if (!swarmFeeds.find((feed) => feed.feedKey === feedStats.feedKey)) {
            swarmFeeds.push(feedStats);
          }
          break;
        }

        case 'dxos.test.feed-load-time': {
          const feedLoadTime = entry.context as FeedLoadTimeEntry;
          // TODO(egorgripasov): Evaluate if we need to make multiple test runs.
          if (feedLoadTime.testCounter > 0) {
            break;
          }

          feedLoadTimes.set(feedLoadTime.replicantId, feedLoadTime.feedLoadTime);
          break;
        }
      }
    });

    const stats: FeedStats[] = [];
    swarmsByAgent.forEach((agentFeeds, replicantId) => {
      agentFeeds.forEach((swarmFeeds, swarmIdx) => {
        swarmFeeds.forEach((feedStats) => {
          if (feedStats.writable) {
            const replicas: FeedReplicaStats[] = [];

            // Check feeds from other agents from this swarm.
            swarmsByAgent.forEach((otherAgentFeeds, otherAgentIdx) => {
              if (otherAgentIdx !== replicantId) {
                const otherSwarmFeeds = otherAgentFeeds.get(swarmIdx)!;
                const otherFeedStats = otherSwarmFeeds.find(
                  (otherFeedStats) => otherFeedStats.feedKey === feedStats.feedKey,
                );

                if (otherFeedStats) {
                  const bytesInSecond = otherFeedStats.byteLength / (feedLoadTimes.get(replicantId)! / 1000);
                  replicas.push({
                    feedLength: otherFeedStats.feedLength,
                    byteLength: otherFeedStats.byteLength,
                    replicationSpeed: unit(bytesInSecond, 'B/s'),
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

// TODO(burdon): Factor out.
const unit = (value: number, unit: string, precision = 2) => {
  const e = Math.floor(Math.log(value) / Math.log(1024));
  return `${(value / Math.pow(1024, e)).toFixed(precision)} ${e > 0 ? 'kMGTP'.charAt(e - 1) : ''}${unit}`;
};
