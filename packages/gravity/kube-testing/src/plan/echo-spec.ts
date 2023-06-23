//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';
import { randomBytes } from 'node:crypto';

import { scheduleTaskInterval, sleep } from '@dxos/async';
import { Client, Config, Invitation, Space, Text } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { Context } from '@dxos/context';
import { failUndefined } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { Timeframe } from '@dxos/timeframe';
import { randomInt, range } from '@dxos/util';

import { Chart, BarController, CategoryScale, LinearScale, LineController, LineElement, PointElement, BarElement, ChartConfiguration } from 'chart.js';
import { createCanvas } from 'canvas';

import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { AgentEnv } from './agent-env';
import { PlanResults, TestParams, TestPlan } from './spec-base';
import { SerializedLogEntry, getReader } from '../analysys';
import { writeFileSync } from 'node:fs';
import { exec } from 'node:child_process';

Chart.register(BarController, CategoryScale, LinearScale, BarElement, LineElement, LineController, PointElement);

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
    const { agentIdx, invitationTopic, signalUrl } = config;

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

    const services = this.builder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    await client.halo.createIdentity({ displayName: `test agent ${env.params.config.agentIdx}` });

    let space: Space;
    if (config.creator) {
      space = await client.createSpace({ name: 'test space' });
      space.createInvitation({
        swarmKey: PublicKey.from(invitationTopic),
        authMethod: Invitation.AuthMethod.NONE,
        type: Invitation.Type.MULTIUSE,
      });
    } else {
      const invitation = client.acceptInvitation({
        swarmKey: PublicKey.from(invitationTopic),
        authMethod: Invitation.AuthMethod.NONE,
        type: Invitation.Type.MULTIUSE,
        kind: Invitation.Kind.SPACE,
      } as any); // TODO(dmaretskyi): Fix types.
      space = await new Promise<Space>((resolve) => {
        invitation.subscribe((event) => {
          switch (event.state) {
            case Invitation.State.SUCCESS:
              resolve(client.getSpace(event.spaceKey!)!);
          }
        });
      });
    }

    const getSpaceBackend = () => services.host._serviceContext.spaceManager.spaces.get(space.key) ?? failUndefined();
    const getObj = () => space.db.objects.find((obj) => obj instanceof Text) as Text;

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

    assert(space);
    log.info('space joined', { agentIdx, spaceKey: space.key });
    await env.syncBarrier('space joined');

    await space.waitUntilReady();
    log.info('space ready', { agentIdx, spaceKey: space.key });
    await env.syncBarrier('space ready');

    space.db.add(new Text('', TextKind.PLAIN));
    await space.db.flush();

    if (config.ephemeral) {
      await client.destroy();
    }

    let iter = 0;
    const lastTimeframe = getSpaceBackend().dataPipeline.pipelineState?.timeframe ?? new Timeframe();
    let lastTime = Date.now();
    const ctx = new Context();
    scheduleTaskInterval(
      ctx,
      async () => {
        log.info('iter', { iter, agentIdx });

        if (!config.ephemeral) {
          await env.redis.set(
            `${env.params.testId}:timeframe:${env.params.agentId}`,
            serializeTimeframe(getSpaceBackend().dataPipeline.pipelineState!.timeframe),
          );
        }

        await env.syncBarrier(`iter ${iter}`);

        if (!config.ephemeral) {
          // compute lag
          const maximalTimeframe = await getMaximalTimeframe();
          const lag = maximalTimeframe.newMessages(getSpaceBackend().dataPipeline.pipelineState!.timeframe);

          // compute throughput
          const mutationsSinceLastIter =
            getSpaceBackend().dataPipeline.pipelineState!.timeframe.newMessages(lastTimeframe);
          const timeSinceLastIter = Date.now() - lastTime;
          lastTime = Date.now();
          const mutationsPerSec = Math.round(mutationsSinceLastIter / (timeSinceLastIter / 1000));

          const epoch = getSpaceBackend().dataPipeline.currentEpoch?.subject.assertion.number ?? -1;

          log.info('stats', { lag, mutationsPerSec, agentIdx, epoch });
          log.trace('dxos.test.echo.stats', { lag, mutationsPerSec, agentIdx, epoch } satisfies StatsLog);

          for (const _ of range(spec.operationCount)) {
            // TODO: extract size and random seed
            getObj().model!.content.insert(
              randomInt(getObj().text.length, 0),
              randomBytes(spec.insertionSize).toString('hex') as any,
            );
            if (getObj().text.length > 100) {
              getObj().model!.content.delete(randomInt(getObj().text.length, 0), randomInt(getObj().text.length, 100));
            }
          }

          await space.db.flush();

          if (agentIdx === 0 && spec.epochPeriod > 0 && iter % spec.epochPeriod === 0) {
            await space.internal.createEpoch();
          }
        } else {
          await client.initialize();

          const begin = Date.now();
          const space = client.spaces.get()[0];
          await space.waitUntilReady();

          const maximalTimeframe = await getMaximalTimeframe();
          await getSpaceBackend().dataPipeline.pipelineState!.waitUntilTimeframe(maximalTimeframe);

          log.info('sync time', { time: Date.now() - begin, agentIdx, iter });

          await client.destroy();
        }

        iter++;
      },
      spec.iterationDelay,
    );

    await sleep(spec.duration);
    await ctx.dispose();
  }

  async finish(params: TestParams<EchoTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();

    const dataPoints: SerializedLogEntry<StatsLog>[] = [];

    const reader = getReader(results);
    for await (const entry of reader) {
      switch (entry.message) {
        case 'dxos.test.echo.stats':
          dataPoints.push(entry)
      }
    }

    const chart = await renderPNG({
      type: 'line',
      data: {
        datasets: [{
          type: 'line',
          data: [{
            x: 1,
            y: 1,
          }, {
            x: 2,
            y: 2,
          }],
        }]
      },
      options: {
        scales: {
          x: {
            display: true,
          },
          y: {
            beginAtZero: true
          }
        }
      }
    })

    showPng(chart)
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
};



function renderPNG(configuration: ChartConfiguration) {

  const canvas = createCanvas(800, 600);
  // Disable animation (otherwise charts will throw exceptions)
  configuration.options ??= {};
  configuration.options.responsive = false;
  configuration.options.animation = false;
  (canvas as any).style = {};
  const context = canvas.getContext('2d');
  const chart = new Chart(context as any, configuration);
  return new Promise<Buffer>((resolve, reject) => {
    // or `pngStream` `toDataURL`, etc
    canvas.toBuffer((error, buffer) => {
      if (error) {
        return reject(error);
      }
      return resolve(buffer);
    });
  });
}

const showPng = (data: Buffer) => {
  const filename = `/tmp/${Math.random().toString(36).substring(7)}.png`;
  writeFileSync(filename, data);
  exec(`open ${filename}`)
}