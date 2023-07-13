//
// Copyright 2023 DXOS.org
//

import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas, ChartJSNodeCanvasOptions } from 'chartjs-node-canvas';
import { exec } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { Client, Config, Invitation, Space, Text, LocalClientServices } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import { randomInt, range } from '@dxos/util';

import { SerializedLogEntry, getReader } from '../analysys';
import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { AgentEnv } from './agent-env';
import { PlanResults, TestParams, TestPlan } from './spec-base';

export type EchoTestSpec = {
  agents: number;
  duration: number;
  iterationDelay: number;

  epochPeriod: number;

  measureNewAgentSyncTime: boolean;

  insertionSize: number;
  operationCount: number;

  signalArguments: string[];
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
  builder = new TestBuilder();

  services!: LocalClientServices;
  client!: Client;
  space!: Space;

  async init({ spec, outDir }: TestParams<EchoTestSpec>): Promise<EchoAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

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

    this.builder.storage = createStorage({ type: StorageType.RAM });
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

        if (!config.ephemeral) {
          await env.redis.set(
            `${env.params.testId}:timeframe:${env.params.agentId}`,
            serializeTimeframe(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe),
          );
        }

        await env.syncBarrier(`iter ${iter}`);

        if (!config.ephemeral) {
          // compute lag
          const maximalTimeframe = await getMaximalTimeframe();
          const lag = maximalTimeframe.newMessages(this.getSpaceBackend().dataPipeline.pipelineState!.timeframe);
          const totalMutations = this.getSpaceBackend().dataPipeline.pipelineState!.timeframe.totalMessages();

          // compute throughput
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
    await this.client.halo.createIdentity({ displayName: `test agent ${env.params.config.agentIdx}` });

    if (env.params.config.creator) {
      this.space = await this.client.createSpace({ name: 'test space' });
      this.space.createInvitation({
        swarmKey: PublicKey.from(env.params.config.invitationTopic),
        authMethod: Invitation.AuthMethod.NONE,
        type: Invitation.Type.MULTIUSE,
      });
    } else {
      const invitation = this.client.acceptInvitation({
        swarmKey: PublicKey.from(env.params.config.invitationTopic),
        authMethod: Invitation.AuthMethod.NONE,
        type: Invitation.Type.MULTIUSE,
        kind: Invitation.Kind.SPACE,
      } as any); // TODO(dmaretskyi): Fix types.
      this.space = await new Promise<Space>((resolve) => {
        invitation.subscribe((event) => {
          switch (event.state) {
            case Invitation.State.SUCCESS:
              resolve(this.client.getSpace(event.spaceKey!)!);
          }
        });
      });
    }
    await this.space.waitUntilReady();
  }

  getSpaceBackend = () => this.services.host._serviceContext.spaceManager.spaces.get(this.space.key) ?? failUndefined();

  getObj = () => this.space.db.objects.find((obj) => obj instanceof Text) as Text;

  async finish(params: TestParams<EchoTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();

    const statsLogs: SerializedLogEntry<StatsLog>[] = [];
    const syncLogs: SerializedLogEntry<SyncTimeLog>[] = [];

    const reader = getReader(results);
    for await (const entry of reader) {
      switch (entry.message) {
        case 'dxos.test.echo.stats':
          statsLogs.push(entry);
          break;
        case 'dxos.test.echo.sync':
          syncLogs.push(entry);
          break;
      }
    }

    if (!params.spec.measureNewAgentSyncTime) {
      showPng(
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
      showPng(
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

const renderPNG = async (
  configuration: ChartConfiguration,
  opts: ChartJSNodeCanvasOptions = { width: 1920, height: 1080, backgroundColour: 'white' },
) => {
  // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
  const chartJSNodeCanvas = new ChartJSNodeCanvas(opts);

  const image = await chartJSNodeCanvas.renderToBuffer(configuration as any);
  return image;
};

const showPng = (data: Buffer) => {
  const filename = `/tmp/${Math.random().toString(36).substring(7)}.png`;
  writeFileSync(filename, data);
  exec(`open ${filename}`);
};

const BORDER_COLORS = [
  'rgb(54, 162, 235)', // blue
  'rgb(255, 99, 132)', // red
  'rgb(255, 159, 64)', // orange
  'rgb(255, 205, 86)', // yellow
  'rgb(75, 192, 192)', // green
  'rgb(153, 102, 255)', // purple
  'rgb(201, 203, 207)', // grey
];
