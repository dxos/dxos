//
// Copyright 2023 DXOS.org
//

import { randomBytes } from 'node:crypto';

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { Space, Text } from '@dxos/client/echo';
import { Invitation } from '@dxos/client/invitations';
import { LocalClientServices } from '@dxos/client/services';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { Space as EchoSpace } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TransportKind } from '@dxos/network-manager';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import { randomInt, range } from '@dxos/util';

import { SerializedLogEntry, getReader, BORDER_COLORS, renderPNG, showPNG } from '../analysys';
import { AgentEnv, PlanResults, TestParams, TestPlan } from '../plan';
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
};

export type EchoAgentConfig = {
  agentIdx: number;
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

  async init({ spec, outDir }: TestParams<EchoTestSpec>): Promise<EchoAgentConfig[]> {
    const signal = await this.signalBuilder.createSignalServer(0, outDir, spec.signalArguments);

    const invitationTopic = PublicKey.random().toHex();
    return range(spec.agents).map((agentIdx) => ({
      agentIdx,
      signalUrl: signal.url(),
      invitationTopic,
      creator: agentIdx === 0,
      ephemeral: spec.measureNewAgentSyncTime && spec.agents > 1 && agentIdx === spec.agents - 1,
    }));
  }

  async run(env: AgentEnv<EchoTestSpec, EchoAgentConfig>): Promise<void> {
    const { config, spec } = env.params;
    const { agentIdx, signalUrl } = config;

    if (!this.builder) {
      this.builder = new TestBuilder(undefined, undefined, undefined, spec.transport);
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
          type: StorageType.NODE,
          root: `/tmp/dxos/gravity/${env.params.testId}/${env.params.agentId}`,
        });
    await this._init(env);

    const getMaximalTimeframe = async () => {
      const timeframes = await Promise.all(
        Object.keys(env.params.agents).map((agentId) =>
          env.redis
            .get(`${env.params.testId}:timeframe:${agentId}`)
            .then((timeframe) => (timeframe ? deserializeTimeframe(timeframe) : new Timeframe())),
        ),
      );
      return Timeframe.merge(...timeframes);
    };

    if (config.creator) {
      this.space.db.add(new Text('', TextKind.PLAIN));
      await this.space.db.flush();
    }

    if (config.ephemeral) {
      await this.client.destroy();
    }

    let iter = 0;
    const lastTimeframe = this.getSpaceBackend().dataPipeline.pipelineState?.timeframe ?? new Timeframe();
    let lastTime = Date.now();
    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        log.info('iter', { iter, agentIdx });

        // Reconnect previously disconnected agent.
        if (!config.ephemeral && !this.client.initialized) {
          log.trace('dxos.test.echo.reconnect', { agentIdx, iter } satisfies ReconnectLog);
          await this._init(env);
        }

        if (!config.ephemeral) {
          await env.redis.set(
            `${env.params.testId}:timeframe:${env.params.agentId}`,
            serializeTimeframe(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe),
          );
        }

        await env.syncBarrier(`iter ${iter}`);

        if (!config.ephemeral) {
          const maximalTimeframe = await getMaximalTimeframe();
          const lag = maximalTimeframe.newMessages(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe);
          const totalMutations = this.getSpaceBackend().dataPipeline.pipelineState!.timeframe.totalMessages();

          // Compute throughput.
          const mutationsSinceLastIter =
            this.getSpaceBackend().dataPipeline.pipelineState!.timeframe.newMessages(lastTimeframe);
          const timeSinceLastIter = Date.now() - lastTime;
          lastTime = Date.now();
          const mutationsPerSec = Math.round(mutationsSinceLastIter / (timeSinceLastIter / 1000));

          const epoch = this.getSpaceBackend().dataPipeline.currentEpoch?.subject.assertion.number ?? -1;

          log.info('stats', { lag, mutationsPerSec, agentIdx, epoch, totalMutations });
          log.trace('dxos.test.echo.stats', {
            lag,
            mutationsPerSec,
            agentIdx,
            epoch,
            totalMutations,
          } satisfies StatsLog);

          // Disconnect some of the agents for one iteration.
          const skipIterration =
            spec.withReconnects && iter > 0 && agentIdx > 0 && iter % agentIdx === 0 && iter % 5 === 0;
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

            if (agentIdx === 0 && spec.epochPeriod > 0 && iter % spec.epochPeriod === 0) {
              await this.space.internal.createEpoch();
            }
          }
        } else {
          const begin = performance.now();

          this.builder.storage = createStorage({ type: StorageType.RAM });
          await this._init(env);

          const maximalTimeframe = await getMaximalTimeframe();
          await this.getSpaceBackend().dataPipeline.pipelineState!.waitUntilTimeframe(maximalTimeframe);

          log.info('sync time', { time: performance.now() - begin, agentIdx, iter });
          log.trace('dxos.test.echo.sync', { time: performance.now() - begin, agentIdx, iter } satisfies SyncTimeLog);

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

    if (!this.spaceKey) {
      await this.client.halo.createIdentity({ displayName: `test agent ${env.params.config.agentIdx}` });
      if (env.params.config.creator) {
        this.space = await this.client.spaces.create({ name: 'test space' });
        this.space.share({
          swarmKey: PublicKey.from(env.params.config.invitationTopic),
          authMethod: Invitation.AuthMethod.NONE,
          type: Invitation.Type.MULTIUSE,
        });
      } else {
        const invitation = this.client.spaces.join({
          swarmKey: PublicKey.from(env.params.config.invitationTopic),
          authMethod: Invitation.AuthMethod.NONE,
          type: Invitation.Type.MULTIUSE,
          kind: Invitation.Kind.SPACE,
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
      `Space is not defined for agent:${env.params.config.agentIdx} creator:${env.params.config.creator}`,
    );
    await this.space.waitUntilReady();
  }

  getSpaceBackend = (): EchoSpace =>
    this.services.host?.context.spaceManager.spaces.get(this.space.key) ?? failUndefined();

  getObj = () => this.space.db.objects.find((obj) => obj instanceof Text) as Text;

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

    if (reconnectLogs.length) {
      const reconnectsCountByAgent = Object.fromEntries(
        range(params.spec.agents).map((agentIdx) => [
          agentIdx,
          reconnectLogs.filter((entry) => entry.context.agentIdx === agentIdx).length,
        ]),
      );
      log.info('reconnects by agent', reconnectsCountByAgent);
    }

    if (params.spec.showPNG) {
      await this.generatePNG(params, statsLogs, syncLogs);
    }
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
            datasets: range(params.spec.agents).map((agentIdx) => ({
              label: `Agent #${agentIdx}`,
              showLine: true,
              data: statsLogs
                .filter((entry) => entry.context.agentIdx === agentIdx)
                .map((entry) => ({
                  x: entry.timestamp,
                  y: entry.context.totalMutations,
                })),
              backgroundColor: BORDER_COLORS[agentIdx % BORDER_COLORS.length],
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
            datasets: range(params.spec.agents).map((agentIdx) => ({
              label: `Agent #${agentIdx}`,
              showLine: true,
              data: syncLogs
                .filter((entry) => entry.context.agentIdx === agentIdx)
                .map((entry) => ({
                  x: entry.timestamp,
                  y: entry.context.time,
                })),
              backgroundColor: BORDER_COLORS[agentIdx % BORDER_COLORS.length],
            })),
          },
          options: {},
        }),
      );
    }
  }
}

const serializeTimeframe = (timeframe: Timeframe) =>
  JSON.stringify(Object.fromEntries(timeframe.frames().map(([k, v]) => [k.toHex(), v])));

const deserializeTimeframe = (timeframe: string) =>
  new Timeframe(Object.entries(JSON.parse(timeframe)).map(([k, v]) => [PublicKey.from(k), v as number]));

type StatsLog = {
  lag: number;
  mutationsPerSec: number;
  epoch: number;
  agentIdx: number;
  totalMutations: number;
};

type SyncTimeLog = {
  time: number;
  agentIdx: number;
  iter: number;
};

type ReconnectLog = {
  agentIdx: number;
  iter: number;
};
