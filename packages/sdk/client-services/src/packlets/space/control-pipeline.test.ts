//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { CredentialGenerator, createCredential, credentialPayload } from '@dxos/credentials';
import { FeedFactory, FeedStore } from '@dxos/feed-store';
import { Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { fromPublicKey, fromTimeframe } from '@dxos/protocols/buf';
import { type FeedMessage, FeedMessageSchema } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import { SpaceMetadataSchema } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { AdmittedFeed_Designation, AdmittedFeedSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { StorageType, createStorage } from '@dxos/random-access-storage';

import { MetadataStore } from '../metadata';
import { valueEncoding } from '../pipeline';
import { ControlPipeline } from './control-pipeline';

describe('space/control-pipeline', () => {
  test('admits feeds', async () => {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();

    const feedStore = new FeedStore<FeedMessage>({
      factory: new FeedFactory<FeedMessage>({
        root: createStorage({ type: StorageType.RAM }).createDirectory(),
        signer: keyring,
        hypercore: {
          valueEncoding,
        },
      }),
    });

    const createFeed = async () => {
      const feedKey = await keyring.createKey();
      return feedStore.openFeed(feedKey, { writable: true });
    };

    // TODO(dmaretskyi): Separate test for cold start after genesis.
    const genesisFeed = await createFeed();
    const metadata = new MetadataStore(createStorage({ type: StorageType.RAM }).createDirectory());
    await metadata.addSpace(
      create(SpaceMetadataSchema, {
        key: fromPublicKey(spaceKey),
        genesisFeedKey: fromPublicKey(genesisFeed.key),
        controlFeedKey: fromPublicKey(genesisFeed.key),
      }),
    );
    const controlPipeline = new ControlPipeline({
      spaceKey,
      genesisFeed,
      feedProvider: (key) => feedStore.openFeed(key),
      metadataStore: metadata,
    });

    const admittedFeeds: PublicKey[] = [];
    controlPipeline.onFeedAdmitted.set(async (info) => {
      log.debug('feed admitted');
      admittedFeeds.push(info.key);
    });
    expect(admittedFeeds).toEqual([]);

    await controlPipeline.setWriteFeed(genesisFeed);
    await controlPipeline.start(Context.default());

    onTestFinished(() => controlPipeline.stop());

    //
    // Genesis
    //
    {
      const generator = new CredentialGenerator(keyring, identityKey, deviceKey);
      const credentials = await generator.createSpaceGenesis(spaceKey, genesisFeed.key);
      expect(credentials).toHaveLength(3);

      for (const credential of credentials) {
        await controlPipeline.pipeline.writer?.write(credentialPayload(credential));
      }

      await controlPipeline.pipeline.state.waitUntilTimeframe(controlPipeline.pipeline.state.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key]);
    }

    // New control feed.
    const controlFeed2 = await createFeed();
    {
      await controlPipeline.pipeline.writer!.write(
        credentialPayload(
          await createCredential({
            signer: keyring,
            issuer: identityKey,
            subject: controlFeed2.key,
            assertion: create(AdmittedFeedSchema, {
              spaceKey: fromPublicKey(spaceKey),
              identityKey: fromPublicKey(identityKey),
              deviceKey: fromPublicKey(deviceKey),
              designation: AdmittedFeed_Designation.CONTROL,
            }),
          }),
        ),
      );

      await controlPipeline.pipeline.state.waitUntilTimeframe(controlPipeline.pipeline.state.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key]);
    }

    // New data feed.
    const dataFeed1 = await createFeed();
    {
      await controlPipeline.pipeline.writer!.write(
        credentialPayload(
          await createCredential({
            signer: keyring,
            issuer: identityKey,
            subject: dataFeed1.key,
            assertion: create(AdmittedFeedSchema, {
              spaceKey: fromPublicKey(spaceKey),
              identityKey: fromPublicKey(identityKey),
              deviceKey: fromPublicKey(deviceKey),
              designation: AdmittedFeed_Designation.DATA,
            }),
          }),
        ),
      );

      const end = controlPipeline.pipeline.state.endTimeframe;
      await controlPipeline.pipeline.state.waitUntilTimeframe(end);
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);
    }

    // TODO(dmaretskyi): Move to other test (data feed cannot admit feeds).
    const dataFeed2 = await createFeed();
    {
      await dataFeed1.append(
        create(FeedMessageSchema, {
          timeframe: fromTimeframe(controlPipeline.pipeline.state.timeframe),
          payload: credentialPayload(
            await createCredential({
              signer: keyring,
              issuer: identityKey,
              subject: dataFeed2.key,
              assertion: create(AdmittedFeedSchema, {
                spaceKey: fromPublicKey(spaceKey),
                identityKey: fromPublicKey(identityKey),
                deviceKey: fromPublicKey(deviceKey),
                designation: AdmittedFeed_Designation.DATA,
              }),
            }),
          ),
        }),
      );

      await controlPipeline.pipeline.state.waitUntilTimeframe(controlPipeline.pipeline.state.endTimeframe);
      expect(admittedFeeds).toEqual([genesisFeed.key, controlFeed2.key, dataFeed1.key]);
    }
  });
});
