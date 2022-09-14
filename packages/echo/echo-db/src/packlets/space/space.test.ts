//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import expect from 'expect';
import { it as test } from 'mocha';

import { codec } from '@dxos/echo-protocol';
import { FeedDescriptor, FeedStore } from '@dxos/feed-store';
import {
  AdmittedFeed,
  createCredential,
  createGenesisCredentialSequence,
  Credential,
  PartyMember
} from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { Space } from './space';

type TestAgent = {
  keyring: Keyring
  identityKey: PublicKey
  deviceKey: PublicKey
}

type TestSpaceContext = {
  space: Space
  genesisFeedKey: PublicKey
  controlFeed: FeedDescriptor
  dataFeed: FeedDescriptor
}

describe('space/space', () => {
  test('database', async () => {
    const agentFactory = new AgentFactory();
    const agent = await agentFactory.createAgent();

    const spaceContext = await agentFactory.createSpace();
    const { space, controlFeed } = spaceContext;

    await space.open();
    expect(space.isOpen).toBeTruthy(); // TODO(burdon): Standardize boolean state getters.
    afterTest(() => space.close());

    {
      // Genesis
      const { identityKey, deviceKey } = agent;

      const genesisMessages = [
        // TODO(burdon): Don't export functions from packages (group into something more accountable).
        //  Change to params object.
        ...await createGenesisCredentialSequence(
          agentFactory.keyring,
          space.key,
          identityKey,
          deviceKey,
          controlFeed.key
        ),
        // TODO(burdon): Factor out.
        ...await createAdmitDataFeedCredentialSequence(agent, spaceContext)
      ];

      for (const credential of genesisMessages) {
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

  // TODO(burdon): Unskip.
  test.skip('2 spaces replicating', async () => {
    //
    // Agent 1
    //
    const [agent1, spaceContext1] = await (async () => {
      const agentFactory = new AgentFactory();
      const agent = await agentFactory.createAgent();

      const spaceContext = await agentFactory.createSpace();
      const { space, controlFeed } = spaceContext;

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      {
        // Genesis
        const { identityKey, deviceKey } = agent;

        const genesisMessages = [
          ...await createGenesisCredentialSequence(
            agentFactory.keyring,
            space.key,
            identityKey,
            deviceKey,
            controlFeed.key
          ),
          ...await createAdmitDataFeedCredentialSequence(agent, spaceContext)
        ];

        for (const credential of genesisMessages) {
          await space.controlMessageWriter?.write({
            '@type': 'dxos.echo.feed.CredentialsMessage',
            credential
          });
        }

        await space.controlPipelineState!.waitUntilReached(space.controlPipelineState!.endTimeframe);
      }

      return [agent, spaceContext];
    })();

    //
    // Agent 2
    //
    const [agent2, spaceContext2] = await (async () => {
      const agentFactory = new AgentFactory();
      const agent = await agentFactory.createAgent();

      // NOTE: The genesisKey would be passed as part of the invitation.
      const spaceContext = await agentFactory.createSpace(spaceContext1.genesisFeedKey);
      const { space } = spaceContext;

      await space.open();
      expect(space.isOpen).toBeTruthy();
      afterTest(() => space.close());

      return [agent, spaceContext];
    })();

    expect(agent1).toBeDefined();
    expect(agent2).toBeDefined();

    {
      // Write invitation.
      const credentials = await createInvitationCredentialSequence(agent1, spaceContext1, agent2, spaceContext2);
      for (const credential of credentials) {
        await spaceContext1.space.controlMessageWriter?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
    }

    {
      // Initial data exchange.

      // Agent 1 reads all written feed messages.
      await spaceContext1.space.controlPipelineState!
        .waitUntilReached(spaceContext1.space.controlPipelineState!.endTimeframe);

      // Agent 2 reads all written feed messages.
      await spaceContext2.space.controlPipelineState!
        .waitUntilReached(spaceContext1.space.controlPipelineState!.endTimeframe);
    }

    {
      // Check item replication from 1 => 2.
      const item1 = await spaceContext1.space.database!.createItem({ type: 'dxos.example.1' });
      const item2 = await spaceContext2.space.database!.waitForItem({ type: 'dxos.example.1' });
      expect(item1.id).toEqual(item2.id);
    }

    {
      // Check item replication from 2 => 1.
      const item1 = await spaceContext2.space.database!.createItem({ type: 'dxos.example.2' });
      const item2 = await spaceContext1.space.database!.waitForItem({ type: 'dxos.example.2' });
      expect(item1.id).toEqual(item2.id);
    }
  });
});

/**
 * Test util.
 */
class AgentFactory {
  public readonly keyring = new Keyring();

  public readonly feedStore = new FeedStore(
    createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec }
  );

  public readonly createFeed = async () => {
    const feedKey = await this.keyring.createKey();
    return this.feedStore.openReadWriteFeedWithSigner(feedKey, this.keyring);
  };

  async createSpace (genesisKey?: PublicKey): Promise<TestSpaceContext> {
    const spaceKey = await this.keyring.createKey();
    const controlWriteFeed = await this.createFeed();
    const dataWriteFeed = await this.createFeed();

    const genesisFeed = genesisKey ? await this.feedStore.openReadOnlyFeed(genesisKey) : controlWriteFeed;

    const space = new Space({
      spaceKey,
      genesisFeed,
      controlWriteFeed, // TODO(burdon): Rename controlFeed?
      dataWriteFeed,
      initialTimeframe: new Timeframe(),
      feedProvider: key => this.feedStore.openReadOnlyFeed(key)
    });

    log(`Created space: ${spaceKey.toHex()}`);

    return {
      space,
      genesisFeedKey: genesisFeed.key,
      controlFeed: controlWriteFeed,
      dataFeed: dataWriteFeed
    };
  }

  async createAgent (): Promise<TestAgent> {
    const identityKey = await this.keyring.createKey();
    const deviceKey = await this.keyring.createKey();

    return {
      keyring: this.keyring,
      identityKey,
      deviceKey
    };
  }
}

/**
 * Create invitation.
 * Admit identity and control and data feeds.
 */
const createInvitationCredentialSequence = async (
  agent1: TestAgent,
  spaceContext1: TestSpaceContext,
  agent2: TestAgent,
  spaceContext2: TestSpaceContext
): Promise<Credential[]> => [
  await createCredential({
    issuer: agent1.identityKey,
    subject: agent2.identityKey,
    assertion: {
      '@type': 'dxos.halo.credentials.PartyMember',
      partyKey: spaceContext2.space.key,
      role: PartyMember.Role.MEMBER
    },
    keyring: agent1.keyring
  }),

  await createCredential({
    issuer: agent1.identityKey,
    subject: spaceContext2.controlFeed.key,
    assertion: {
      '@type': 'dxos.halo.credentials.AdmittedFeed',
      partyKey: spaceContext2.space.key,
      identityKey: agent2.identityKey,
      deviceKey: agent2.deviceKey,
      designation: AdmittedFeed.Designation.CONTROL
    },
    keyring: agent1.keyring
  }),

  await createCredential({
    issuer: agent1.identityKey,
    subject: spaceContext2.dataFeed.key,
    assertion: {
      '@type': 'dxos.halo.credentials.AdmittedFeed',
      partyKey: spaceContext2.space.key,
      identityKey: agent2.identityKey,
      deviceKey: agent2.deviceKey,
      designation: AdmittedFeed.Designation.DATA
    },
    keyring: agent1.keyring
  })
];

const createAdmitDataFeedCredentialSequence = async (
  agent: TestAgent,
  spaceContext: TestSpaceContext
): Promise<Credential[]> => [
  await createCredential({
    issuer: agent.identityKey,
    subject: spaceContext.dataFeed.key,
    assertion: {
      '@type': 'dxos.halo.credentials.AdmittedFeed',
      partyKey: spaceContext.space.key,
      identityKey: agent.identityKey,
      deviceKey: agent.deviceKey,
      designation: AdmittedFeed.Designation.DATA
    },
    keyring: agent.keyring
  })
];
