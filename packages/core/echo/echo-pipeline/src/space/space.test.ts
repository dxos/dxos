//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Context } from '@dxos/context';
import { CredentialGenerator } from '@dxos/credentials';
import { afterTest, describe, test } from '@dxos/test';

import { TestAgentBuilder } from '../testing';

// TODO(burdon): Factor out?
const run = <T>(cb: () => Promise<T>): Promise<T> => cb();

describe('space/space', () => {
  test('creates a database with object model', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());
    const agent = await builder.createPeer();
    const space = await agent.createSpace();

    await space.open(Context.default());
    expect(space.isOpen).toBeTruthy();
    afterTest(() => space.close());

    await agent.spaceGenesis(space);

    await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);

    await builder.close();
    expect(space.isOpen).toBeFalsy();
  });

  test('two spaces replicating', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());

    //
    // Agent 1
    //
    const [agent1, space1] = await run(async () => {
      const agent = await builder.createPeer();
      const space = await agent.createSpace(agent.identityKey);

      await space.open(Context.default());
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      await agent.spaceGenesis(space);

      await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);

      return [agent, space];
    });

    //
    // Agent 2
    //
    const [agent2, space2] = await run(async () => {
      // NOTE: The genesisKey would be passed as part of the invitation.
      const agent = await builder.createPeer();
      const space = await agent.createSpace(agent.identityKey, space1.key, space1.genesisFeedKey, undefined, true);

      await space.open(Context.default());
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      return [agent, space];
    });

    expect(agent1).toBeDefined();
    expect(agent2).toBeDefined();

    {
      // Write invitation from agent 1.
      const generator = new CredentialGenerator(agent1.keyring, agent1.identityKey, agent1.deviceKey);
      const credentials = await generator.createMemberInvitation(
        space1.key,
        agent2.identityKey,
        agent2.deviceKey,
        space2.controlFeedKey!,
        space2.dataFeedKey!,
        space1.genesisFeedKey,
      );

      for (const credential of credentials) {
        await space1.controlPipeline.writer.write({
          credential: { credential },
        });
      }
    }

    {
      // Initial data exchange.

      // Agent 1 reads all feed messages.
      await space1.controlPipeline.state!.waitUntilTimeframe(space1.controlPipeline.state!.endTimeframe);

      // Agent 2 reads all feed messages.
      await space2.controlPipeline.state!.waitUntilTimeframe(space1.controlPipeline.state!.endTimeframe);
    }

    // TODO(burdon): Write multiple items (extract for all tests).

    await builder.close();
    expect(space1.isOpen).toBeFalsy();
    expect(space2.isOpen).toBeFalsy();
  });

  test('open & close', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());
    const agent = await builder.createPeer();
    const space1 = await agent.createSpace();

    await space1.open(Context.default());
    expect(space1.isOpen).toBeTruthy();
    afterTest(() => space1.close());

    await agent.spaceGenesis(space1);

    await space1.controlPipeline.state!.waitUntilTimeframe(space1.controlPipeline.state!.endTimeframe);

    await space1.close();
    expect(space1.isOpen).toBeFalsy();

    // Re-open.
    const space2 = await agent.createSpace(agent.identityKey, space1.key, space1.genesisFeedKey, space1.dataFeedKey);

    await space2.open(Context.default());
    await space2.controlPipeline.state!.waitUntilTimeframe(space2.controlPipeline.state!.endTimeframe);
  });

  test('re-open', async () => {
    const builder = new TestAgentBuilder();
    afterTest(async () => await builder.close());
    const agent = await builder.createPeer();
    const space = await agent.createSpace();

    {
      await space.open(Context.default());
      afterTest(() => space.close());
      expect(space.isOpen).toBeTruthy();

      await agent.spaceGenesis(space);

      await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);

      await space.close();
      expect(space.isOpen).toBeFalsy();
    }

    // Re-open.
    {
      await space.open(Context.default());
      expect(space.isOpen).toBeTruthy();

      await space.controlPipeline.state!.waitUntilTimeframe(space.controlPipeline.state!.endTimeframe);
    }
  });
});
