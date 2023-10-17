//
// Copyright 2022 DXOS.org
//

import platform from 'platform';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { createCredentialSignerWithKey, CredentialGenerator } from '@dxos/credentials';
import { type MetadataStore, type SpaceManager, type SwarmIdentity } from '@dxos/echo-pipeline';
import { type FeedStore } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type IdentityRecord, type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import { AdmittedFeed, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Timeframe } from '@dxos/timeframe';
import { trace as Trace } from '@dxos/tracing';
import { deferFunction } from '@dxos/util';

import { createAuthProvider } from './authenticator';
import { Identity } from './identity';

interface ConstructSpaceParams {
  spaceRecord: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  identityKey: PublicKey;
}

export type JoinIdentityParams = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  haloSpaceKey: PublicKey;
  haloGenesisFeedKey: PublicKey;
  controlFeedKey: PublicKey;
  dataFeedKey: PublicKey;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;
};

export type CreateIdentityOptions = {
  displayName?: string;
};

// TODO(dmaretskyi): Rename: represents the peer's state machine.
@Trace.resource()
export class IdentityManager {
  readonly stateUpdate = new Event();

  private _identity?: Identity;

  // TODO(burdon): IdentityManagerParams.
  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor(
    private readonly _metadataStore: MetadataStore,
    private readonly _keyring: Keyring,
    private readonly _feedStore: FeedStore<FeedMessage>,
    private readonly _spaceManager: SpaceManager,
  ) {}

  get identity() {
    return this._identity;
  }

  @Trace.span({ showInBrowserTimeline: true })
  async open(ctx: Context) {
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.halo.identity-manager.open', trace.begin({ id: traceId }));

    const identityRecord = this._metadataStore.getIdentityRecord();
    log('identity record', { identityRecord });
    if (identityRecord) {
      this._identity = await this._constructIdentity(identityRecord);
      await this._identity.open(ctx);
      await this._identity.ready();
      log.trace('dxos.halo.identity', {
        identityKey: identityRecord.identityKey,
        displayName: this._identity.profileDocument?.displayName,
      });
      this.stateUpdate.emit();
    }
    log.trace('dxos.halo.identity-manager.open', trace.end({ id: traceId }));
  }

  async close() {
    await this._identity?.close(new Context());
  }

  async createIdentity({ displayName }: CreateIdentityOptions = {}) {
    invariant(!this._identity, 'Identity already exists.');
    log('creating identity...');

    const controlFeedKey = await this._keyring.createKey();
    const identityRecord: IdentityRecord = {
      identityKey: await this._keyring.createKey(),
      deviceKey: await this._keyring.createKey(),
      haloSpace: {
        key: await this._keyring.createKey(),
        genesisFeedKey: controlFeedKey,
        controlFeedKey,
        dataFeedKey: await this._keyring.createKey(),
      },
    };

    const identity = await this._constructIdentity(identityRecord);
    await identity.open(new Context());

    {
      const generator = new CredentialGenerator(this._keyring, identityRecord.identityKey, identityRecord.deviceKey);
      invariant(identityRecord.haloSpace.genesisFeedKey, 'Genesis feed key is required.');
      invariant(identityRecord.haloSpace.dataFeedKey, 'Data feed key is required.');
      const credentials = [
        // Space genesis.
        ...(await generator.createSpaceGenesis(identityRecord.haloSpace.key, identityRecord.haloSpace.genesisFeedKey)),

        // Feed admission.
        await generator.createFeedAdmission(
          identityRecord.haloSpace.key,
          identityRecord.haloSpace.dataFeedKey,
          AdmittedFeed.Designation.DATA,
        ),
      ];

      if (displayName) {
        credentials.push(await generator.createProfileCredential({ displayName }));
      }

      // Device authorization (writes device chain).
      // NOTE: This credential is written last. This is a hack to make sure that display name is set before identity is "ready".
      credentials.push(await generator.createDeviceAuthorization(identityRecord.deviceKey));

      // Write device metadata to profile.
      credentials.push(
        await generator.createDeviceProfile({
          platform: platform.name,
          platformVersion: platform.version,
          architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
          os: platform.os?.family,
          osVersion: platform.os?.version,
        }),
      );
      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          credential: { credential },
        });
      }
    }

    // TODO(burdon): ???
    // await this._keyring.deleteKey(identityRecord.identity_key);
    // await this._keyring.deleteKey(identityRecord.halo_space.space_key);

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready();
    log.trace('dxos.halo.identity', {
      identityKey: identityRecord.identityKey,
      displayName: this._identity.profileDocument?.displayName,
    });
    this.stateUpdate.emit();

    log('created identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
    return identity;
  }

  /**
   * Accept an existing identity. Expects it's device key to be authorized (now or later).
   */
  async acceptIdentity(params: JoinIdentityParams) {
    log('accepting identity', { params });
    invariant(!this._identity, 'Identity already exists.');

    const identityRecord: IdentityRecord = {
      identityKey: params.identityKey,
      deviceKey: params.deviceKey,
      haloSpace: {
        key: params.haloSpaceKey,
        genesisFeedKey: params.haloGenesisFeedKey,
        controlFeedKey: params.controlFeedKey,
        dataFeedKey: params.dataFeedKey,
        controlTimeframe: params.controlTimeframe,
      },
    };

    const identity = await this._constructIdentity(identityRecord);
    await identity.open(new Context());
    this._identity = identity;
    await this._metadataStore.setIdentityRecord(identityRecord);
    await this._identity.ready();
    log.trace('dxos.halo.identity', {
      identityKey: identityRecord.identityKey,
      displayName: this._identity.profileDocument?.displayName,
    });

    {
      // Write device metadata.
      const credential = await identity.getIdentityCredentialSigner().createCredential({
        subject: identity.deviceKey,
        assertion: {
          '@type': 'dxos.halo.credentials.DeviceProfile',
          profile: {
            platform: platform.name,
            platformVersion: platform.version,
            architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
            os: platform.os?.family,
            osVersion: platform.os?.version,
          },
        },
      });

      await identity.controlPipeline.writer.write({ credential: { credential } });
    }

    this.stateUpdate.emit();
    log('accepted identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
    return identity;
  }

  /**
   * Update the profile document of an existing identity.
   */
  async updateProfile(profile: ProfileDocument) {
    invariant(this._identity, 'Identity not initialized.');
    // TODO(wittjosiah): Use CredentialGenerator.
    const credential = await this._identity.getIdentityCredentialSigner().createCredential({
      subject: this._identity.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile,
      },
    });

    const receipt = await this._identity.controlPipeline.writer.write({ credential: { credential } });
    await this._identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
    this.stateUpdate.emit();
    return profile;
  }

  private async _constructIdentity(identityRecord: IdentityRecord) {
    invariant(!this._identity);
    log('constructing identity', { identityRecord });

    // Must be created before the space so the feeds are writable.
    invariant(identityRecord.haloSpace.controlFeedKey);
    const controlFeed = await this._feedStore.openFeed(identityRecord.haloSpace.controlFeedKey, {
      writable: true,
    });
    invariant(identityRecord.haloSpace.dataFeedKey);
    const dataFeed = await this._feedStore.openFeed(identityRecord.haloSpace.dataFeedKey, {
      writable: true,
      sparse: true,
    });

    const space = await this._constructSpace({
      spaceRecord: identityRecord.haloSpace,
      swarmIdentity: {
        peerKey: identityRecord.deviceKey,
        credentialProvider: createAuthProvider(createCredentialSignerWithKey(this._keyring, identityRecord.deviceKey)),
        credentialAuthenticator: deferFunction(() => identity.authVerifier.verifier),
      },
      identityKey: identityRecord.identityKey,
    });
    space.setControlFeed(controlFeed);
    space.setDataFeed(dataFeed);

    const identity: Identity = new Identity({
      space,
      signer: this._keyring,
      identityKey: identityRecord.identityKey,
      deviceKey: identityRecord.deviceKey,
    });
    log('done', { identityKey: identityRecord.identityKey });

    // TODO(mykola): Set new timeframe on a write to a feed.
    if (identityRecord.haloSpace.controlTimeframe) {
      identity.controlPipeline.state.setTargetTimeframe(identityRecord.haloSpace.controlTimeframe);
    }

    return identity;
  }

  private async _constructSpace({ spaceRecord, swarmIdentity, identityKey }: ConstructSpaceParams) {
    return this._spaceManager.constructSpace({
      metadata: {
        key: spaceRecord.key,
        genesisFeedKey: spaceRecord.genesisFeedKey,
      },
      swarmIdentity,
      onNetworkConnection: () => {},
      onAuthFailure: () => {
        log.warn('auth failure');
      },
      memberKey: identityKey,
    });
  }
}
