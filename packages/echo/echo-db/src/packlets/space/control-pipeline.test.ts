import { sleep } from '@dxos/async';
import { Keyring, KeyType } from '@dxos/credentials';
import { createKeyPair } from '@dxos/crypto';
import { codec } from '@dxos/echo-protocol';
import { FeedStore } from '@dxos/feed-store';
import { AdmittedFeed, createCredential, PartyMember } from '@dxos/halo-protocol';
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
    controlPipeline.onFeedAdmitted.set(info => {
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
      await controlPipeline.writer!.write({
        halo: { credential: await createCredential({
          issuer: spaceKey,
          subject: spaceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            partyKey: spaceKey
          },
          keyring
        })
      } })
     
      await controlPipeline.writer!.write({
        halo: { credential: await createCredential({
          issuer: spaceKey,
          subject: identityKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            partyKey: spaceKey,
            role: PartyMember.Role.ADMIN
          },
          keyring
        })
      } })
      expect(admittedFeeds).toEqual([]);

      await controlPipeline.writer!.write({
        halo: { credential: await createCredential({
          issuer: identityKey,
          subject: genesisFeed.key,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            partyKey: spaceKey,
            identityKey,
            deviceKey,
            designation: AdmittedFeed.Designation.CONTROL
          },
          keyring,
        })
      } })
      await waitForExpect(() => {
        expect(admittedFeeds).toEqual([genesisFeed.key]);
      })
    }

    // New control feed.
    const controlFeed2 = await createFeed();    
    await controlPipeline.writer!.write({
      halo: { credential: await createCredential({
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
    } })
    await waitForExpect(() => {
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key]);
    })
    
    // New data feed.
    const dataFeed = await createFeed();    
    await controlPipeline.writer!.write({
      halo: { credential: await createCredential({
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
    } })
    await waitForExpect(() => {
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed.key]);
    })

    // TODO(dmaretskyi): Move to other test (data feed cannot admit feeds).
    const otherFeed = await createFeed();
    dataFeed.append({
      halo: { credential: await createCredential({
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
      }) },
      timeframe: new Timeframe()
    })

    // TODO(dmaretskyi): Count ignored messages.
    // TODO(dmaretskyi): Wait for queues to be emptied (or last timeframe message to be processed).
    // Make sure all events are processed.
    await sleep(10)
    expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed.key]);
  });
});
