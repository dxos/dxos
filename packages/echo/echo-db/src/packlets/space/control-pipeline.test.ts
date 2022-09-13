//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, createCredential, createGenesisCredentialSequence } from '@dxos/halo-protocol';
import { Keyring } from '@dxos/keyring';
import { log } from '@dxos/log';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';

import { ControlPipeline } from './control-pipeline';

describe('space/control-pipeline', () => {
  test('admits feeds', async () => {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    const feedStore = new FeedStore(createStorage({ type: StorageType.RAM }).createDirectory(), { valueEncoding: codec });
    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openReadWriteFeedWithSigner(feedKey, keyring);
    };

    // TODO(dmaretskyi): Separate test for cold start after genesis.
    const genesisFeed = await createFeed();

    const controlPipeline = new ControlPipeline({
      spaceKey,
      genesisFeed,
      initialTimeframe: new Timeframe(),
      feedProvider: key => feedStore.openReadOnlyFeed(key)
    });

    const admittedFeeds: PublicKey[] = [];
    controlPipeline.onFeedAdmitted.set(async info => {
      log.debug('feed admitted');
      admittedFeeds.push(info.key);
    });
    expect(admittedFeeds).toEqual([]);

    controlPipeline.setWriteFeed(genesisFeed);
    controlPipeline.start();
    afterTest(() => controlPipeline.stop());

    //
    // Genesis
    //
    {
      // TODO(burdon): Don't export functions from packages (group into something more accountable).
      const genesisMessages = await createGenesisCredentialSequence(
        keyring,
        spaceKey,
        identityKey,
        deviceKey,
        genesisFeed.key
      );

      for (const credential of genesisMessages) {
        await controlPipeline.writer?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }
      await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key]);
    }

    // New control feed.
    const controlFeed2 = await createFeed();
    await controlPipeline.writer!.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await createCredential({
        issuer: identityKey,
        subject: controlFeed2.key,
        assertion: {
          '@type': 'dxos.halo.credentials.AdmittedFeed',
          partyKey: spaceKey,
          identityKey,
          deviceKey,
          designation: AdmittedFeed.Designation.CONTROL
        },
        keyring
      })
    });
    await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key]);

    // New data feed.
    const dataFeed1 = await createFeed();
    await controlPipeline.writer!.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await createCredential({
        issuer: identityKey,
        subject: dataFeed1.key,
        assertion: {
          '@type': 'dxos.halo.credentials.AdmittedFeed',
          partyKey: spaceKey,
          identityKey,
          deviceKey,
          designation: AdmittedFeed.Designation.DATA
        },
        keyring
      })
    });
    await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);

    // TODO(dmaretskyi): Move to other test (data feed cannot admit feeds).
    const dataFeed2 = await createFeed();
    {
      await dataFeed1.append({
        payload: {
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            issuer: identityKey,
            subject: dataFeed2.key,
            assertion: {
              '@type': 'dxos.halo.credentials.AdmittedFeed',
              partyKey: spaceKey,
              identityKey,
              deviceKey,
              designation: AdmittedFeed.Designation.DATA
            },
            keyring
          })
        },
        timeframe: new Timeframe()
      });

      // TODO(dmaretskyi): Count ignored messages.
      await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);
    }
  });
});
