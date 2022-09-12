import { sleep } from '@dxos/async';
import { Keyring, KeyType } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, createCredential, createGenesisCredentialSequence, PartyMember } from '@dxos/halo-protocol';
import { PublicKey, Timeframe } from '@dxos/protocols';
import { createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { afterTest } from '@dxos/testutils';
import { it as test } from 'mocha'
import { ControlPipeline } from './control-pipeline';
import expect from 'expect'
import { log } from '@dxos/log'
import waitForExpect from 'wait-for-expect';

describe('space/ControlPipeline', () => {
  test('admits feeds', async () => {
    const feedStore = new FeedStore(createStorage('', StorageType.RAM).directory(), { valueEncoding: codec });
    const createFeed = () => {
      const { publicKey, secretKey } = createKeyPair();
      return feedStore.openReadWriteFeed(PublicKey.from(publicKey), secretKey);
    }

    const keyring = new Keyring();
    const { publicKey: spaceKey } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identityKey } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: deviceKey } = await keyring.createKeyRecord({ type: KeyType.DEVICE });

    // TODO(dmaretskyi): Separate test for cold start after genesis.
    const genesisFeed = await createFeed();

    const controlPipeline = new ControlPipeline({
      spaceKey,
      genesisFeed,
      initialTimeframe: new Timeframe(),
      openFeed: key => feedStore.openReadOnlyFeed(key),
    })

    const admittedFeeds: PublicKey[] = [];
    controlPipeline.onFeedAdmitted.set(async info => {
      log.debug('feed admitted')
      admittedFeeds.push(info.key);
    });
    expect(admittedFeeds).toEqual([]);

    controlPipeline.setWriteFeed(genesisFeed);
    controlPipeline.start()
    afterTest(() => controlPipeline.stop())

    //
    // Genesis
    //
    {
      const genesisMessages = await createGenesisCredentialSequence(
        keyring,
        spaceKey,
        identityKey,
        deviceKey,
        genesisFeed.key,
      )
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
          keyring,
        })
    })
    await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key]);

    // New data feed.
    const dataFeed = await createFeed();
    await controlPipeline.writer!.write({
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await createCredential({
          issuer: identityKey,
          subject: dataFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: spaceKey,
            identityKey,
            deviceKey,
            designation: AdmittedFeed.Designation.DATA
          },
          keyring,
        })
    })
    await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed.key]);

    // TODO(dmaretskyi): Move to other test (data feed cannot admit feeds).
    const otherFeed = await createFeed();
    dataFeed.append({
      payload: {
        '@type': 'dxos.echo.feed.CredentialsMessage',
        credential: await createCredential({
          issuer: identityKey,
          subject: otherFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: spaceKey,
            identityKey,
            deviceKey,
            designation: AdmittedFeed.Designation.DATA
          },
          keyring,
        })
      },
      timeframe: new Timeframe()
    })

    

    // TODO(dmaretskyi): Count ignored messages.
    await controlPipeline.pipelineState.waitUntilReached(controlPipeline.pipelineState.endTimeframe);
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed.key]);
  });
});
