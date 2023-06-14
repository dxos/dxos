//
// Copyright 2023 DXOS.org
//


import { randomInt, range } from '@dxos/util';
import { AgentEnv } from './agent-env';
import { PlanResults, TestParams, TestPlan } from './spec-base';
import { PublicKey } from '@dxos/keys';
import { TestBuilder } from '@dxos/client/testing'
import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { Client, Config, Expando, Invitation, Space, Text } from '@dxos/client'
import assert from 'node:assert';
import { log } from '@dxos/log';
import { Context } from '@dxos/context';
import { scheduleTaskInterval, sleep } from '@dxos/async';
import { randomBytes } from 'node:crypto';
import { Timeframe } from '@dxos/timeframe'

import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { failUndefined } from '@dxos/debug';

export type EchoTestSpec = {
  agents: number;
  duration: number;
  iterationDelay: number;

  insertionSize: number,
  operationCount: number

  signalArguments: string[];
};

export type EchoAgentConfig = {
  agentIdx: number;
  signalUrl: string;
  invitationTopic: string
};

export class EchoTestPlan implements TestPlan<EchoTestSpec, EchoAgentConfig> {
  signalBuilder = new SignalTestBuilder();
  builder = new TestBuilder();

  async init({ spec, outDir }: TestParams<EchoTestSpec>): Promise<EchoAgentConfig[]> {
    const signal = await this.signalBuilder.createServer(0, outDir, spec.signalArguments);

    const invitationTopic = PublicKey.random().toHex();
    return range(spec.agents).map(agentIdx => ({
      agentIdx,
      signalUrl: signal.url(),
      invitationTopic,
    }));
  }

  async run(env: AgentEnv<EchoTestSpec, EchoAgentConfig>): Promise<void> {
    const { config, spec } = env.params;
    const { agentIdx, invitationTopic, signalUrl } = config;

    this.builder.config = new Config({
      runtime: {
        services: {
          signaling: [{
            server: signalUrl
          }],
        }
      }
    })

    const services = this.builder.createLocal();
    const client = new Client({ services });
    await client.initialize();
    await client.halo.createIdentity({ displayName: `test agent ${env.params.config.agentIdx}` });

    let space: Space;
    if (agentIdx === 0) {
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
      space = await new Promise<Space>(resolve => {
        invitation.subscribe(event => {
          switch (event.state) {
            case Invitation.State.SUCCESS:
              resolve(client.getSpace(event.spaceKey!)!);
          }
        })
      })
    }

    assert(space);
    const spaceBackend = services.host._serviceContext.spaceManager.spaces.get(space.key) ?? failUndefined();


    log.info(`space joined`, { agentIdx, spaceKey: space.key });
    await env.syncBarrier(`space joined`)

    await space.waitUntilReady()
    log.info(`space ready`, { agentIdx, spaceKey: space.key });
    await env.syncBarrier(`space ready`)

    const obj = space.db.add(new Text('', TextKind.PLAIN))
    await space.db.flush()



    let iter = 0;
    let lastTimeframe = spaceBackend.dataPipeline.pipelineState!.timeframe;
    let lastTime = Date.now();
    const ctx = new Context()
    scheduleTaskInterval(ctx, async () => {
      log.info('iter', { iter, agentIdx })

      await env.redis.set(`${env.params.testId}:timeframe:${env.params.agentId}`, serializeTimeframe(spaceBackend.dataPipeline.pipelineState!.timeframe))

      await env.syncBarrier(`iter ${iter}`)

      // compute lag
      const timeframes = await Promise.all(Object.keys(env.params.agents).map(agentId => env.redis.get(`${env.params.testId}:timeframe:${agentId}`).then(timeframe => timeframe ? deserializeTimeframe(timeframe) : new Timeframe())))
      const maximalTimeframe = Timeframe.merge(...timeframes)
      const lag = maximalTimeframe.newMessages(spaceBackend.dataPipeline.pipelineState!.timeframe)

      // compute throughput
      const mutationsSinceLastIter = spaceBackend.dataPipeline.pipelineState!.timeframe.newMessages(lastTimeframe);
      const timeSinceLastIter = Date.now() - lastTime;
      lastTime = Date.now()
      const mutationsPerSec = Math.round(mutationsSinceLastIter / (timeSinceLastIter / 1000))
      
      log.info('stats', { lag, mutationsPerSec, agentIdx })

      // TODO(dmaretskyi): Replace with timeframe lag.
      let totalTextLength = 0
      for (const obj of space.db.objects) {
        if (obj instanceof Text) {
          totalTextLength += obj.text.length;
        }
      }

      for(const _ of range(spec.operationCount)) {
        // TODO: extract size and random seed
        obj.model!.content.insert(randomInt(obj.text.length, 0), randomBytes(spec.insertionSize).toString('hex') as any)
        if (obj.text.length > 100) {
          obj.model!.content.delete(randomInt(obj.text.length, 0), randomInt(obj.text.length, 100))
        }
      }

      await space.db.flush()
      iter++;
    }, spec.iterationDelay);

    await sleep(spec.duration);
    ctx.dispose();
  }

  async finish(params: TestParams<EchoTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();
  }
}


const serializeTimeframe = (timeframe: Timeframe) => JSON.stringify(Object.fromEntries(timeframe.frames().map(([k, v]) => [k.toHex(), v])))

const deserializeTimeframe = (timeframe: string) => new Timeframe(Object.entries(JSON.parse(timeframe)).map(([k, v]) => [PublicKey.from(k), v as number]))