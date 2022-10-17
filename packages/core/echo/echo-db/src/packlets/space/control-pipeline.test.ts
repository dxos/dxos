//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { CredentialGenerator, createCredential } from '@dxos/credentials';
import { FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { AdmittedFeed } from '@dxos/protocols/proto/dxos/halo/credentials';
import { createStorage, StorageType } from '@dxos/random-access-storage';
import { afterTest } from '@dxos/testutils';
import { Timeframe } from '@dxos/timeframe';

import { codec } from '../common';
import { ControlPipeline } from './control-pipeline';

describe('space/control-pipeline', function () {
  it('admits feeds', async function () {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    const directory = createStorage({ type: StorageType.RAM }).createDirectory();
    const feedStore = new FeedStore(directory, { valueEncoding: codec });

    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openFeed(feedKey, { writable: true });
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
      const generator = new CredentialGenerator(keyring, identityKey, deviceKey);
      const credentials = await generator.createSpaceGenesis(spaceKey, genesisFeed.key);

      for (const credential of credentials) {
        await controlPipeline.pipeline.writer?.write({
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential
        });
      }

      await controlPipeline.pipeline.state.waitUntilReached(controlPipeline.pipeline.state.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key]);
    }

    // New control feed.
    const controlFeed2 = await createFeed();
    await controlPipeline.pipeline.writer!.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await createCredential({
        signer: keyring,
        issuer: identityKey,
        subject: controlFeed2.key,
        assertion: {
          '@type': 'dxos.halo.credentials.AdmittedFeed',
          partyKey: spaceKey,
          identityKey,
          deviceKey,
          designation: AdmittedFeed.Designation.CONTROL
        }
      })
    });

    await controlPipeline.pipeline.state.waitUntilReached(controlPipeline.pipeline.state.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key]);

    // New data feed.
    const dataFeed1 = await createFeed();
    await controlPipeline.pipeline.writer!.write({
      '@type': 'dxos.echo.feed.CredentialsMessage',
      credential: await createCredential({
        signer: keyring,
        issuer: identityKey,
        subject: dataFeed1.key,
        assertion: {
          '@type': 'dxos.halo.credentials.AdmittedFeed',
          partyKey: spaceKey,
          identityKey,
          deviceKey,
          designation: AdmittedFeed.Designation.DATA
        }
      })
    });

    await controlPipeline.pipeline.state.waitUntilReached(controlPipeline.pipeline.state.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);

    // TODO(dmaretskyi): Move to other test (data feed cannot admit feeds).
    const dataFeed2 = await createFeed();
    {
      await dataFeed1.append({
        payload: {
          '@type': 'dxos.echo.feed.CredentialsMessage',
          credential: await createCredential({
            signer: keyring,
            issuer: identityKey,
            subject: dataFeed2.key,
            assertion: {
              '@type': 'dxos.halo.credentials.AdmittedFeed',
              partyKey: spaceKey,
              identityKey,
              deviceKey,
              designation: AdmittedFeed.Designation.DATA
            }
          })
        },
        timeframe: new Timeframe()
      });

      // TODO(dmaretskyi): Count ignored messages.
      await controlPipeline.pipeline.state.waitUntilReached(controlPipeline.pipeline.state.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);
    }
  });
});
