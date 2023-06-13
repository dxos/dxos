//
// Copyright 2023 DXOS.org
//


import { range } from '@dxos/util';
import { AgentEnv } from './agent-env';
import { PlanResults, TestParams, TestPlan } from './spec-base';
import { PublicKey } from '@dxos/keys';
import { TestBuilder } from '@dxos/client/testing'
import { TestBuilder as SignalTestBuilder } from '../test-builder';
import { Client, Config, Expando, Invitation, Space } from '@dxos/client'
import assert from 'node:assert';
import { log } from '@dxos/log';
import { Context } from '@dxos/context';
import { scheduleTaskInterval, sleep } from '@dxos/async';

export type EchoTestSpec = {
  agents: number;
  duration: number;
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

    const client = new Client({ services: this.builder.createLocal() });
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
    log.info(`space joined`, { agentIdx, spaceKey: space.key });
    await env.syncBarrier(`space joined`)

    await space.waitUntilReady()
    log.info(`space ready`, { agentIdx, spaceKey: space.key });
    await env.syncBarrier(`space ready`)

    let iter = 0;
    const ctx = new Context()
    scheduleTaskInterval(ctx, async () => {
      log.info('iter', { iter, agentIdx })
      await env.syncBarrier(`iter ${iter}`)

      space.db.add(new Expando({
        text: '123'
      }))
      await space.db.flush()

      log.info('iter complete', { itemCount: space.db.objects.length})

      iter++;
    }, 500);

    await sleep(spec.duration);
    ctx.dispose();
  }

  async finish(params: TestParams<EchoTestSpec>, results: PlanResults): Promise<any> {
    await this.signalBuilder.destroy();

  }
}
