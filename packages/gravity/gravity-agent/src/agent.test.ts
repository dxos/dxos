//
// Copyright 2022 DXOS.org
//

import { expect } from 'chai';

import { sleep, Trigger } from '@dxos/async';
import { Space } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { ConfigProto } from '@dxos/config';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AgentSpec } from '@dxos/protocols/proto/dxos/gravity';
import { afterTest } from '@dxos/testutils';

import { Agent } from './agent';
import { TestStateMachineFactory } from './statemachine';

// TODO(burdon): Run local signal server for tests.
describe('Agent', () => {
  test('creates and starts a basic agent', async () => {
    const config: ConfigProto = { version: 1 };
    const agent = new Agent({ config });
    await agent.initialize();
    expect(agent.client).to.exist;
    expect(agent.started).to.be.false;
    await agent.start();
    expect(agent.started).to.be.true;
    await agent.stop();
    expect(agent.started).to.be.false;
    await agent.destroy();
  });

  it('creates a space', async () => {
    const config: ConfigProto = { version: 1 };
    const agent = new Agent({ config });
    await agent.initialize();
    const space = await agent.client!.echo.createSpace();
    expect(space.key).to.exist;
    expect(space.properties).to.exist;
    await agent.destroy();
  });

  it.only('tests two agents', async () => {
    const config: ConfigProto = { version: 1 };

    const swarmKey = PublicKey.random();
    console.log(swarmKey.toString());
    const spec1: AgentSpec = {
      stateMachine: 'test-host',
      startSequence: {
        commands: [
          {
            createProfile: {}
          }
        ]
      },
      testSequences: [
        {
          commands: [
            {
              createSpace: {
                id: 'space-1'
              }
            },
            {
              createSpaceInvitation: {
                id: 'space-1',
                swarmKey: swarmKey.toHex()
              }
            }
          ]
        }
      ]
    };

    const spec2: AgentSpec = {
      stateMachine: 'test-guest',
      startSequence: {
        commands: [
          {
            createProfile: {}
          }
        ]
      },
      testSequences: [
        {
          commands: [
            {
              acceptSpaceInvitation: {
                swarmKey: swarmKey.toHex()
              }
            }
          ]
        }
      ]
    };

    // TODO(burdon): Capture logs/stats.
    // TODO(burdon): Error handling.

    const testBuilder = new TestBuilder();

    // TODO(burdon): Extend TestBuilder pattern for gravity-agent package.
    const agent1 = new Agent({
      config,
      services: testBuilder.createClientServicesHost(),
      spec: spec1,
      stateMachine: TestStateMachineFactory(spec1.stateMachine!)
    });
    const agent2 = new Agent({
      config,
      services: testBuilder.createClientServicesHost(),
      spec: spec2,
      stateMachine: TestStateMachineFactory(spec2.stateMachine!)
    });

    // Initialize.
    await Promise.all([agent1.initialize(), agent2.initialize()]);
    afterTest(() => Promise.all([agent1.destroy(), agent2.destroy()]));

    // Run sequences.
    const space1 = new Trigger<Space>();
    const space2 = new Trigger<Space>();

    agent1.sequenceComplete.once(() => {
      const results = agent1.client.echo.querySpaces();
      space1.wake(results.value[0]!);
    });
    agent2.sequenceComplete.once(() => {
      const results = agent2.client.echo.querySpaces();
      space2.wake(results.value[0]!);
    });

    // Test invitation happened.
    await Promise.all([agent1.start(), agent2.start()]);
    const [s1, s2] = await Promise.all([space1.wait(), space2.wait()]);
    log('synchronized', { space1: s1.key, space2: s2.key });
    expect(s1.key).to.deep.eq(s2.key);

    // TODO(burdon): Stopping too early (before items can be created).
    log('sleeping...');
    await sleep(100);

    // TODO(burdon): Test passes but hangs (protocol ETIMEOUT).
    await Promise.all([agent1.stop(), agent2.stop()]);
  });
});
