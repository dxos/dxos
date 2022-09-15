//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { AdmittedFeed, CredentialGenerator } from '@dxos/halo-protocol';
import { ObjectModel } from '@dxos/object-model';
import { afterTest } from '@dxos/testutils';

import { TestAgentFactory } from './testing';

describe('space/space', () => {
  test('database', async () => {
    const agentFactory = new TestAgentFactory();
    const agent = await agentFactory.createAgent();
    const spaceContext = await agent.createSpace(agent.identityKey);
    const { space, controlKey } = spaceContext;

    await space.open();
    expect(space.isOpen).toBeTruthy(); // TODO(burdon): Standardize boolean state getters.
    afterTest(() => space.close());

    {
      // Genesis
      const generator = new CredentialGenerator(agent.keyring, agent.identityKey, agent.deviceKey);
      const credentials = [
        ...await generator.createSpaceGenesis(space.key, controlKey),
        await generator.createFeedAdmission(
          spaceContext.space.key,
          spaceContext.dataKey,
          AdmittedFeed.Designation.DATA
        )
      ];

      for (const credential of credentials) {
        await space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }

      // TODO(burdon): Don't expose.
      await space.controlPipelineState!.waitUntilReached(space.controlPipelineState!.endTimeframe);
    }

    {
      assert(space.database);
      const item1 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' });
      const item2 = await space.database.createItem<ObjectModel>({ type: 'dxos.example' });

      // TODO(burdon): No foo/bar.
      await item1.model.set('foo', 'one');
      await item2.model.set('foo', 'two');

      expect(item1.model.get('foo')).toEqual('one');
      expect(item2.model.get('foo')).toEqual('two');

      expect(space.database.select({ type: 'dxos.example' }).exec().entities).toHaveLength(2);
    }
  });

  test('2 spaces replicating', async () => {
    const agentFactory = new TestAgentFactory();

    // TODO(burdon): Factor out?
    const run = <T> (cb: () => Promise<T>): Promise<T> => cb();

    //
    // Agent 1
    //
    const [agent1, spaceContext1] = await run(async () => {
      const agent = await agentFactory.createAgent();
      const spaceContext = await agent.createSpace(agent.identityKey);
      const { space, controlKey } = spaceContext;

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      {
        // Genesis
        const generator = new CredentialGenerator(agent.keyring, agent.identityKey, agent.deviceKey);
        const credentials = [
          ...await generator.createSpaceGenesis(space.key, controlKey),
          await generator.createFeedAdmission(
            spaceContext.space.key,
            spaceContext.dataKey,
            AdmittedFeed.Designation.DATA
          )
        ];

        for (const credential of credentials) {
          await space.controlMessageWriter?.write({
            '@type': 'dxos.echo.feed.CredentialsMessage',
            credential
          });
        }

        await space.controlPipelineState!.waitUntilReached(space.controlPipelineState!.endTimeframe);
      }

      return [agent, spaceContext];
    });

    //
    // Agent 2
    //
    const [agent2, spaceContext2] = await run(async () => {
      // NOTE: The genesisKey would be passed as part of the invitation.
      const agent = await agentFactory.createAgent();
      const spaceContext = await agent.createSpace(
        agent.identityKey, spaceContext1.space.key, spaceContext1.genesisKey);
      const { space } = spaceContext;

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      return [agent, spaceContext];
    });

    expect(agent1).toBeDefined();
    expect(agent2).toBeDefined();

    {
      // Write invitation from agent 1.
      const generator = new CredentialGenerator(agent1.keyring, agent1.identityKey, agent1.deviceKey);
      const credentials = await generator.createMemberInvitation(
        spaceContext1.space.key,
        agent2.identityKey,
        agent2.deviceKey,
        spaceContext2.controlKey,
        spaceContext2.dataKey
      );

      for (const credential of credentials) {
        await spaceContext1.space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    {
      // Initial data exchange.

      // Agent 1 reads all feed messages.
      await spaceContext1.space.controlPipelineState!.waitUntilReached(
        spaceContext1.space.controlPipelineState!.endTimeframe);

      // Agent 2 reads all feed messages.
      await spaceContext2.space.controlPipelineState!.waitUntilReached(
        spaceContext1.space.controlPipelineState!.endTimeframe);
    }

    // TODO(burdon): Write multiple items.

    {
      // Check item replicated from 1 => 2.
      const item1 = await spaceContext1.space.database!.createItem({ type: 'dxos.example.1' });
      const item2 = await spaceContext2.space.database!.waitForItem({ type: 'dxos.example.1' });
      expect(item1.id).toEqual(item2.id);
    }

    {
      // Check item replicated from 2 => 1.
      const item1 = await spaceContext2.space.database!.createItem({ type: 'dxos.example.2' });
      const item2 = await spaceContext1.space.database!.waitForItem({ type: 'dxos.example.2' });
      expect(item1.id).toEqual(item2.id);
    }
  });
});
