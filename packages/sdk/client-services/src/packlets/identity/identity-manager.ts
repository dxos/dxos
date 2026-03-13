//
// Copyright 2022 DXOS.org
//
import platform from 'platform';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialGenerator, createCredentialSignerWithKey, createDidFromIdentityKey } from '@dxos/credentials';
import { type MetadataStore, type SpaceManager, type SwarmIdentity } from '@dxos/echo-pipeline';
import { type EdgeConnection } from '@dxos/edge-client';
import { type FeedStore } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { trace } from '@dxos/protocols';
import { Device, DeviceKind } from '@dxos/protocols/proto/dxos/client/services';
import { type Runtime } from '@dxos/protocols/proto/dxos/config';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type IdentityRecord, type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import {
  AdmittedFeed,
  type Credential,
  type DeviceProfileDocument,
  DeviceType,
  type ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace as Trace } from '@dxos/tracing';
import { deferFunction, isNode } from '@dxos/util';

import { createAuthProvider } from './authenticator';
import { Identity } from './identity';

const DEVICE_PRESENCE_ANNOUNCE_INTERVAL = 10_000;
const DEVICE_PRESENCE_OFFLINE_TIMEOUT = 20_000;

interface ConstructSpaceProps {
  spaceRecord: SpaceMetadata;
  swarmIdentity: SwarmIdentity;
  identityKey: PublicKey;
  gossip: Gossip;
}

export type JoinIdentityProps = {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  haloSpaceKey: PublicKey;
  haloGenesisFeedKey: PublicKey;
  controlFeedKey: PublicKey;
  dataFeedKey: PublicKey;
  authorizedDeviceCredential: Credential;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;
  deviceProfile?: DeviceProfileDocument;
};

export type CreateIdentityOptions = {
  profile?: ProfileDocument;
  deviceProfile?: DeviceProfileDocument;
};

export type IdentityManagerProps = {
  metadataStore: MetadataStore;
  keyring: Keyring;
  feedStore: FeedStore<FeedMessage>;
  spaceManager: SpaceManager;
  edgeConnection?: EdgeConnection;
  edgeFeatures?: Runtime.Client.EdgeFeatures;
  devicePresenceAnnounceInterval?: number;
  devicePresenceOfflineTimeout?: number;
};

@Trace.resource()
export class IdentityManager {
  readonly stateUpdate = new Event();

  private readonly _metadataStore: MetadataStore;
  private readonly _keyring: Keyring;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _spaceManager: SpaceManager;
  private readonly _devicePresenceAnnounceInterval: number;
  private readonly _devicePresenceOfflineTimeout: number;
  private readonly _edgeConnection: EdgeConnection | undefined;
  private readonly _edgeFeatures: Runtime.Client.EdgeFeatures | undefined;

  private _identity?: Identity;

  constructor(params: IdentityManagerProps) {
    this._metadataStore = params.metadataStore;
    this._keyring = params.keyring;
    this._feedStore = params.feedStore;
    this._spaceManager = params.spaceManager;
    this._edgeConnection = params.edgeConnection;
    this._edgeFeatures = params.edgeFeatures;
    this._devicePresenceAnnounceInterval = params.devicePresenceAnnounceInterval ?? DEVICE_PRESENCE_ANNOUNCE_INTERVAL;
    this._devicePresenceOfflineTimeout = params.devicePresenceOfflineTimeout ?? DEVICE_PRESENCE_OFFLINE_TIMEOUT;
  }

  get identity() {
    return this._identity;
  }

  @Trace.span({ showInBrowserTimeline: true })
  async open(ctx: Context): Promise<void> {
    const traceId = PublicKey.random().toHex();
    log.trace('dxos.halo.identity-manager.open', trace.begin({ id: traceId }));

    const identityRecord = this._metadataStore.getIdentityRecord();
    log('identity record', { identityRecord });
    if (identityRecord) {
      this._identity = await this._constructIdentity(ctx, identityRecord);
      await this._identity.open(ctx);
      await this._identity.ready(ctx);
      log.trace('dxos.halo.identity', {
        identityKey: identityRecord.identityKey,
        displayName: this._identity.profileDocument?.displayName,
      });

      this.stateUpdate.emit();
    }
    log.trace('dxos.halo.identity-manager.open', trace.end({ id: traceId }));
  }

  async close(ctx: Context): Promise<void> {
    await this._identity?.close(ctx);
  }

  async createIdentity(ctx: Context, { profile, deviceProfile }: CreateIdentityOptions = {}): Promise<Identity> {
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

    const identity = await this._constructIdentity(ctx, identityRecord);
    await identity.open(ctx);

    {
      const generator = new CredentialGenerator(this._keyring, identityRecord.identityKey, identityRecord.deviceKey);
      invariant(identityRecord.haloSpace.genesisFeedKey, 'Genesis feed key is required.');
      invariant(identityRecord.haloSpace.dataFeedKey, 'Data feed key is required.');
      const credentials = [
        ...(await generator.createSpaceGenesis(identityRecord.haloSpace.key, identityRecord.haloSpace.genesisFeedKey)),
        await generator.createFeedAdmission(
          identityRecord.haloSpace.key,
          identityRecord.haloSpace.dataFeedKey,
          AdmittedFeed.Designation.DATA,
        ),
      ];

      if (profile) {
        credentials.push(await generator.createProfileCredential(profile));
      }

      credentials.push(await generator.createDeviceAuthorization(identityRecord.deviceKey));

      credentials.push(
        await generator.createDeviceProfile({
          ...this.createDefaultDeviceProfile(ctx),
          ...deviceProfile,
        }),
      );
      for (const credential of credentials) {
        await identity.controlPipeline.writer.write({
          credential: { credential },
        });
      }
    }

    await this._metadataStore.setIdentityRecord(identityRecord);
    this._identity = identity;
    await this._identity.ready(ctx);
    log.trace('dxos.halo.identity', {
      identityKey: identityRecord.identityKey,
      displayName: this._identity.profileDocument?.displayName,
    });
    this.stateUpdate.emit();

    log('created identity', {
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey,
      profile: identity.profileDocument,
    });

    return identity;
  }

  createDefaultDeviceProfile(ctx: Context): DeviceProfileDocument {
    let type: DeviceType;
    if (isNode()) {
      type = DeviceType.AGENT;
    } else {
      if (platform.name?.startsWith('iOS') || platform.name?.startsWith('Android')) {
        type = DeviceType.MOBILE;
      } else if ((globalThis as any).__args) {
        type = DeviceType.NATIVE;
      } else {
        type = DeviceType.BROWSER;
      }
    }

    return {
      type,
      platform: platform.name,
      platformVersion: platform.version,
      architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
      os: platform.os?.family,
      osVersion: platform.os?.version,
    };
  }

  async prepareIdentity(ctx: Context, params: JoinIdentityProps) {
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
    const identity = await this._constructIdentity(ctx, identityRecord);
    await identity.open(ctx);
    return { identity, identityRecord };
  }

  public async acceptIdentity(
    ctx: Context,
    identity: Identity,
    identityRecord: IdentityRecord,
    profile?: DeviceProfileDocument,
  ): Promise<void> {
    this._identity = identity;

    await this._identity.ready(ctx);
    await this._metadataStore.setIdentityRecord(identityRecord);

    log.trace('dxos.halo.identity', {
      identityKey: this._identity!.identityKey,
      displayName: this._identity.profileDocument?.displayName,
    });

    await this.updateDeviceProfile(ctx, {
      ...this.createDefaultDeviceProfile(ctx),
      ...profile,
    });
    this.stateUpdate.emit();

    log('accepted identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
  }

  async updateProfile(ctx: Context, profile: ProfileDocument): Promise<ProfileDocument> {
    invariant(this._identity, 'Identity not initialized.');
    const credential = await this._identity.getIdentityCredentialSigner(ctx).createCredential({
      subject: this._identity.identityKey,
      assertion: {
        '@type': 'dxos.halo.credentials.IdentityProfile',
        profile,
      },
    });

    const receipt = await this._identity.controlPipeline.writer.write({ credential: { credential } });
    await this._identity.controlPipeline.state.waitUntilTimeframe(ctx, new Timeframe([[receipt.feedKey, receipt.seq]]));
    this.stateUpdate.emit();
    return profile;
  }

  async updateDeviceProfile(ctx: Context, profile: DeviceProfileDocument): Promise<Device> {
    invariant(this._identity, 'Identity not initialized.');

    const credential = await this._identity.getDeviceCredentialSigner(ctx).createCredential({
      subject: this._identity.deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.DeviceProfile',
        profile,
      },
    });

    const receipt = await this._identity.controlPipeline.writer.write({ credential: { credential } });
    await this._identity.controlPipeline.state.waitUntilTimeframe(ctx, new Timeframe([[receipt.feedKey, receipt.seq]]));
    this.stateUpdate.emit();
    return {
      deviceKey: this._identity.deviceKey,
      kind: DeviceKind.CURRENT,
      presence: Device.PresenceState.ONLINE,
      profile,
    };
  }

  private async _constructIdentity(ctx: Context, identityRecord: IdentityRecord): Promise<Identity> {
    invariant(!this._identity);
    log('constructing identity', { identityRecord });

    const gossip = new Gossip({
      localPeerId: identityRecord.deviceKey,
    });
    const presence = new Presence({
      announceInterval: this._devicePresenceAnnounceInterval,
      offlineTimeout: this._devicePresenceOfflineTimeout,
      identityKey: identityRecord.deviceKey,
      gossip,
    });

    invariant(identityRecord.haloSpace.controlFeedKey);
    const controlFeed = await this._feedStore.openFeed(identityRecord.haloSpace.controlFeedKey, {
      writable: true,
    });
    invariant(identityRecord.haloSpace.dataFeedKey);
    const dataFeed = await this._feedStore.openFeed(identityRecord.haloSpace.dataFeedKey, {
      writable: true,
      sparse: true,
    });

    const space = await this._constructSpace(ctx, {
      spaceRecord: identityRecord.haloSpace,
      swarmIdentity: {
        identityKey: identityRecord.identityKey,
        peerKey: identityRecord.deviceKey,
        credentialProvider: createAuthProvider(createCredentialSignerWithKey(this._keyring, identityRecord.deviceKey)),
        credentialAuthenticator: deferFunction(() => identity.authVerifier.verifier),
      },
      gossip,
      identityKey: identityRecord.identityKey,
    });
    await space.setControlFeed(ctx, controlFeed);
    await space.setDataFeed(ctx, dataFeed);

    const did = await createDidFromIdentityKey(identityRecord.identityKey);
    const identity: Identity = new Identity({
      space,
      presence,
      signer: this._keyring,
      did,
      identityKey: identityRecord.identityKey,
      deviceKey: identityRecord.deviceKey,
      edgeConnection: this._edgeConnection,
      edgeFeatures: this._edgeFeatures,
    });
    log('done', { identityKey: identityRecord.identityKey });

    if (identityRecord.haloSpace.controlTimeframe) {
      identity.controlPipeline.state.setTargetTimeframe(ctx, identityRecord.haloSpace.controlTimeframe);
    }

    identity.stateUpdate.on(() => this.stateUpdate.emit());
    return identity;
  }

  private async _constructSpace(
    ctx: Context,
    { spaceRecord, swarmIdentity, identityKey, gossip }: ConstructSpaceProps,
  ) {
    return this._spaceManager.constructSpace(ctx, {
      metadata: {
        key: spaceRecord.key,
        genesisFeedKey: spaceRecord.genesisFeedKey,
      },
      swarmIdentity,
      onAuthorizedConnection: (session) => {
        session.addExtension(
          'dxos.mesh.teleport.gossip',
          gossip.createExtension({ remotePeerId: session.remotePeerId }),
        );
      },
      onAuthFailure: () => {
        log.warn('auth failure');
      },
      memberKey: identityKey,
      onDelegatedInvitationStatusChange: async () => {},
      onMemberRolesChanged: async () => {},
    });
  }
}
