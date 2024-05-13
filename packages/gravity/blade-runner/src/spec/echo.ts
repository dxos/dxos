//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { TextV0Type } from '@braneframe/types';
import { scheduleTaskInterval, sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Invitation } from '@dxos/client/invitations';
import { type LocalClientServices } from '@dxos/client/services';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { type Space as EchoSpace } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TransportKind } from '@dxos/network-manager';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import { isNode, randomInt, range } from '@dxos/util';

import { type SerializedLogEntry, getReader, BORDER_COLORS, renderPNG, showPNG } from '../analysys';
import {
  type ReplicantRunOptions,
  type AgentEnv,
  type PlanResults,
  type TestParams,
  type TestPlan,
  type Platform,
} from '../plan';
import { TestBuilder as SignalTestBuilder } from '../test-builder';

export type EchoTestSpec = {
  agents: number;
  duration: number;
  iterationDelay: number;
  epochPeriod: number;
  measureNewAgentSyncTime: boolean;
  insertionSize: number;
  operationCount: number;
  signalArguments: string[];
  transport: TransportKind;
  showPNG: boolean;
  withReconnects: boolean;
  platform: Platform;
};

export type EchoAgentConfig = {
  replicantId: number;
  signalUrl: string;
  invitationTopic: string;

  /// ROLES

  /**
   * Creates the space and invites other agents.
   */
  creator: boolean;

  /**
   * Only comes online periodically to measure sync time.
   */
  ephemeral: boolean;
};

export class EchoTestPlan implements TestPlan<EchoTestSpec, EchoAgentConfig> {
  signalBuilder = new SignalTestBuilder();
  builder!: TestBuilder;

  services!: LocalClientServices;
  client!: Client;
  space!: Space;
  spaceKey?: PublicKey;
  onError?: (err: Error) => void;

  defaultSpec(): EchoTestSpec {
    return {
      agents: 2,
      duration: 30_000,
      iterationDelay: 2000,
      epochPeriod: 8,
      // measureNewAgentSyncTime: true,
      measureNewAgentSyncTime: false,
      insertionSize: 128,
      operationCount: 20,
      signalArguments: ['globalsubserver'],
      showPNG: false,
      // transport: TransportKind.TCP,
      transport: TransportKind.SIMPLE_PEER,
      // withReconnects: false,
      withReconnects: true,
      platform: 'chromium',
    };
  }

  async init({ spec, outDir }: TestParams<EchoTestSpec>): Promise<ReplicantRunOptions<EchoAgentConfig>[]> {
    const signal = await this.signalBuilder.createSignalServer(0, outDir, spec.signalArguments, (err) => {
      log.error('error in signal server', { err });
      this.onError?.(err);
    });

    const invitationTopic = PublicKey.random().toHex();
    return range(spec.agents).map((replicantId) => ({
      config: {
        replicantId,
        signalUrl: signal.url(),
        invitationTopic,
        creator: replicantId === 0,
        ephemeral: spec.measureNewAgentSyncTime && spec.agents > 1 && replicantId === spec.agents - 1,
      },
      runtime: { platform: spec.platform },
    }));
  }

  async run(env: AgentEnv<EchoTestSpec, EchoAgentConfig>): Promise<void> {
    const { config, spec } = env.params;
    const { replicantId, signalUrl } = config;

    if (!this.builder) {
      this.builder = new TestBuilder(undefined, undefined, spec.transport);
    }

    this.builder.config = new Config({
      runtime: {
        services: {
          signaling: [
            {
              server: signalUrl,
            },
          ],
        },
      },
    });

    this.builder.storage = !spec.withReconnects
      ? createStorage({ type: StorageType.RAM })
      : createStorage({
          type: isNode() ? StorageType.NODE : StorageType.WEBFS,
          root: `/tmp/dxos/gravity/${env.params.testId}/${env.params.replicantId}`,
        });
    await this._init(env);

    const getMaximalTimeframe = async () => {
      const timeframes = await Promise.all(
        Object.keys(env.params.agents).map((replicantId) =>
          env.redis
            .get(`${env.params.testId}:timeframe:${replicantId}`)
            .then((timeframe) => (timeframe ? deserializeTimeframe(timeframe) : new Timeframe())),
        ),
      );
      return Timeframe.merge(...timeframes);
    };

    if (config.creator) {
      const { create } = await import('@dxos/echo-schema');

      this.space.db.add(create(TextV0Type, { content: '' }));
      await this.space.db.flush();
    }

    if (config.ephemeral) {
      await this.client.destroy();
    }

    let iter = 0;
    // const lastTimeframe = this.getSpaceBackend().dataPipeline.pipelineState?.timeframe ?? new Timeframe();
    let lastTime = Date.now();
    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        log.info('iter', { iter, replicantId });

        // Reconnect previously disconnected agent.
        if (!config.ephemeral && !this.client.initialized) {
          log.trace('dxos.test.echo.reconnect', { replicantId, iter } satisfies ReconnectLog);
          await this._init(env);
        }

        if (!config.ephemeral) {
          // await env.redis.set(
          //   `${env.params.testId}:timeframe:${env.params.replicantId}`,
          //   serializeTimeframe(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe),
          // );
        }

        await env.syncBarrier(`iter ${iter}`);

        if (!config.ephemeral) {
          const _maximalTimeframe = await getMaximalTimeframe();
          // const lag = maximalTimeframe.newMessages(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe);
          // const totalMutations = this.getSpaceBackend().dataPipeline.pipelineState!.timeframe.totalMessages();

          // Compute throughput.
          // const mutationsSinceLastIter =
          //   this.getSpaceBackend().dataPipeline.pipelineState!.timeframe.newMessages(lastTimeframe);
          const _timeSinceLastIter = Date.now() - lastTime;
          lastTime = Date.now();
          // const mutationsPerSec = Math.round(mutationsSinceLastIter / (timeSinceLastIter / 1000));

          // const epoch = this.getSpaceBackend().dataPipeline.currentEpoch?.subject.assertion.number ?? -1;

          // log.info('stats', { lag, mutationsPerSec, replicantId, epoch, totalMutations });
          // log.trace('dxos.test.echo.stats', {
          //   lag,
          //   mutationsPerSec,
          //   replicantId,
          //   epoch,
          //   totalMutations,
          // } satisfies StatsLog);

          // Disconnect some of the agents for one iteration.
          const skipIterration =
            spec.withReconnects && iter > 0 && replicantId > 0 && iter % replicantId === 0 && iter % 5 === 0;
          if (skipIterration) {
            await this.client.destroy();
          } else {
            for (const idx of range(spec.operationCount)) {
              // TODO: extract size and random seed
              this.getObj().model!.content.insert(
                randomInt(this.getObj().text.length, 0),
                randomBytes(spec.insertionSize).toString('hex') as any,
              );
              if (this.getObj().text.length > 100) {
                this.getObj().model!.content.delete(
                  randomInt(this.getObj().text.length, 0),
                  randomInt(this.getObj().text.length, 100),
                );
              }

              if (idx % 100 === 0) {
                await this.space.db.flush();
              }
            }

            await this.space.db.flush();

            if (replicantId === 0 && spec.epochPeriod > 0 && iter % spec.epochPeriod === 0) {
              await this.space.internal.createEpoch();
            }
          }
        } else {
          const begin = performance.now();

          this.builder.storage = createStorage({ type: StorageType.RAM });
          await this._init(env);

          // const maximalTimeframe = await getMaximalTimeframe();
          // await this.getSpaceBackend().dataPipeline.pipelineState!.waitUntilTimeframe(maximalTimeframe);

          log.info('sync time', { time: performance.now() - begin, replicantId, iter });
          log.trace('dxos.test.echo.sync', { time: performance.now() - begin, replicantId, iter } satisfies SyncTimeLog);

          await this.client.destroy();
        }

        iter++;
      },
      spec.iterationDelay,
    );

    await sleep(spec.duration);
    await ctx.dispose();
  }

  private async _init(env: AgentEnv<EchoTestSpec, EchoAgentConfig>) {
    this.services = this.builder.createLocal();
    this.client = new Client({ services: this.services });
    await this.client.initialize();

    this.client.experimental.graph.runtimeSchemaRegistry.registerSchema(TextV0Type);

    if (!this.spaceKey) {
      await this.client.halo.createIdentity({ displayName: `test agent ${env.params.config.replicantId}` });
      if (env.params.config.creator) {
        this.space = await this.client.spaces.create({ name: 'test space' });
        this.space.share({
          swarmKey: PublicKey.from(env.params.config.invitationTopic),
          authMethod: Invitation.AuthMethod.NONE,
          type: Invitation.Type.INTERACTIVE,
          multiUse: true,
        });
      } else {
        const invitation = this.client.spaces.join({
          swarmKey: PublicKey.from(env.params.config.invitationTopic),
          authMethod: Invitation.AuthMethod.NONE,
          type: Invitation.Type.INTERACTIVE,
          kind: Invitation.Kind.SPACE,
          multiUse: true,
        } as any); // TODO(dmaretskyi): Fix types.
        this.space = await new Promise<Space>((resolve) => {
          invitation.subscribe((event) => {
            switch (event.state) {
              case Invitation.State.SUCCESS:
                this.client.spaces.subscribe({
                  next: (spaces) => {
                    const space = spaces.find((space) => space.key === event.spaceKey);
                    if (space) {
                      resolve(space);
                    }
                  },
                });
            }
          });
        });
      }
      this.spaceKey = this.space.key;
    } else {
      this.space = await this.client.spaces.get(this.spaceKey)!;
    }

    invariant(
      this.space,
      `Space is not defined for agent:${env.params.config.replicantId} creator:${env.params.config.creator}`,
    );
    await this.space.waitUntilReady();
  }

  getSpaceBackend = (): EchoSpace =>
    this.services.host?.context.spaceManager.spaces.get(this.space.key) ?? failUndefined();

  getObj = () => this.space.db.objects.find((obj) => obj instanceof TextObject) as TextObject;

  async finish(params: TestParams<EchoTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();

    const statsLogs: SerializedLogEntry<StatsLog>[] = [];
    const syncLogs: SerializedLogEntry<SyncTimeLog>[] = [];
    const reconnectLogs: SerializedLogEntry<ReconnectLog>[] = [];

    const reader = getReader(results);
    for await (const entry of reader) {
      switch (entry.message) {
        case 'dxos.test.echo.stats':
          statsLogs.push(entry);
          break;
        case 'dxos.test.echo.sync':
          syncLogs.push(entry);
          break;
        case 'dxos.test.echo.reconnect':
          reconnectLogs.push(entry);
          break;
      }
    }

    const resultsSummary: Record<string, any> = {};
    if (reconnectLogs.length) {
      const reconnectsCountByAgent = Object.fromEntries(
        range(params.spec.agents).map((replicantId) => [
          replicantId,
          reconnectLogs.filter((entry) => entry.context.replicantId === replicantId).length,
        ]),
      );
      log.info('reconnects by agent', reconnectsCountByAgent);
      resultsSummary['reconnects by agent'] = reconnectsCountByAgent;
    }

    const mutationsByAgent = Object.fromEntries(
      range(params.spec.agents).map((replicantId) => {
        const mutationRates = statsLogs
          .filter((entry) => entry.context.replicantId === replicantId)
          .map((entry) => entry.context.mutationsPerSec)
          .sort((n1, n2) => n1 - n2);

        const meanMutationRate = mutationRates.reduce((sum, rate) => sum + rate, 0) / mutationRates.length;
        const medianMutationRate = mutationRates[Math.floor(mutationRates.length / 2)];
        const ninetyfifthPercentileMutationRate =
          mutationRates
            .reverse()
            .slice(0, Math.floor(mutationRates.length * 0.95))
            .reduce((sum, rate) => sum + rate, 0) / mutationRates.length;

        return [
          replicantId,
          {
            totalMutations:
              statsLogs.filter((entry) => entry.context.replicantId === replicantId).findLast(() => true)?.context
                .totalMutations ?? 0,
            meanMutationRate,
            medianMutationRate,
            ninetyfifthPercentileMutationRate,
          },
        ];
      }),
    );
    log.info('mutations by agent', mutationsByAgent);
    resultsSummary['mutations by agent'] = mutationsByAgent;

    const totalMutations = Object.values(mutationsByAgent).map((entry) => entry.totalMutations);
    const mutationsMatch = totalMutations.every((val, i, arr) => Math.abs(val - arr[0]) < 2);

    if (!mutationsMatch) {
      log.warn('not all agents have the same number of mutations +/-1', { totalMutations });
    }

    resultsSummary['agent mutations summary'] = {
      mutationsMatch,
      totalMutations: totalMutations[0],
      mutationRate:
        Object.values(mutationsByAgent).reduce((sum, entry) => sum + entry.medianMutationRate, 0) /
        Object.keys(mutationsByAgent).length,
    };

    log.info('mutation summary', resultsSummary['agent mutations summary']);

    if (params.spec.showPNG) {
      await this.generatePNG(params, statsLogs, syncLogs);
    }

    return resultsSummary;
  }

  private async generatePNG(
    params: TestParams<EchoTestSpec>,
    statsLogs: SerializedLogEntry<StatsLog>[],
    syncLogs: SerializedLogEntry<SyncTimeLog>[],
  ) {
    if (!params.spec.measureNewAgentSyncTime) {
      showPNG(
        await renderPNG({
          type: 'scatter',
          data: {
            datasets: range(params.spec.agents).map((replicantId) => ({
              label: `Agent #${replicantId}`,
              showLine: true,
              data: statsLogs
                .filter((entry) => entry.context.replicantId === replicantId)
                .map((entry) => ({
                  x: entry.timestamp,
                  y: entry.context.totalMutations,
                })),
              backgroundColor: BORDER_COLORS[replicantId % BORDER_COLORS.length],
            })),
          },
          options: {},
        }),
      );
    } else {
      showPNG(
        await renderPNG({
          type: 'scatter',
          data: {
            datasets: range(params.spec.agents).map((replicantId) => ({
              label: `Agent #${replicantId}`,
              showLine: true,
              data: syncLogs
                .filter((entry) => entry.context.replicantId === replicantId)
                .map((entry) => ({
                  x: entry.timestamp,
                  y: entry.context.time,
                })),
              backgroundColor: BORDER_COLORS[replicantId % BORDER_COLORS.length],
            })),
          },
          options: {},
        }),
      );
    }
  }
}

const _serializeTimeframe = (timeframe: Timeframe) =>
  JSON.stringify(Object.fromEntries(timeframe.frames().map(([k, v]) => [k.toHex(), v])));

const deserializeTimeframe = (timeframe: string) =>
  new Timeframe(Object.entries(JSON.parse(timeframe)).map(([k, v]) => [PublicKey.from(k), v as number]));

type StatsLog = {
  lag: number;
  mutationsPerSec: number;
  epoch: number;
  replicantId: number;
  totalMutations: number;
};

type SyncTimeLog = {
  time: number;
  replicantId: number;
  iter: number;
};

type ReconnectLog = {
  replicantId: number;
  iter: number;
};
