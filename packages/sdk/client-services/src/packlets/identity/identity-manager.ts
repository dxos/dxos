//
// Copyright 2022 DXOS.org
//
import { isValidAutomergeUrl } from '@automerge/automerge-repo';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import platform from 'platform';

import { Event } from '@dxos/async';
import { Context } from '@dxos/context';
import { CredentialGenerator, createCredentialSignerWithKey, createDidFromIdentityKey } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type EchoHost } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { type FeedStore, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';
import { Device, DeviceKind } from '@dxos/protocols/proto/dxos/client/services';
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
import { deferFunction, isNode, isTauri } from '@dxos/util';

import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import { type SpaceManager, SpaceManagerService, type SwarmIdentity } from '../space/index.ts';
import { openCredentialsDocument } from '../spaces/credentials-document-store.ts';
import { createAuthProvider } from './authenticator.ts';
import { Identity } from './identity.ts';

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
   * Automerge URL of the host's halo space root, when it has one. The joining device adopts it rather
   * than minting a second root over the same space.
   */
  haloSpaceRootUrl?: string;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;
  // Custom device profile, merged with defaults, to be applied once the identity is accepted.
  deviceProfile?: DeviceProfileDocument;
};

export type CreateIdentityOptions = {
  profile?: ProfileDocument;
  // device profile for device creating the identity.
  deviceProfile?: DeviceProfileDocument;
};

export type IdentityManagerProps = {
  metadataStore: IMetadataStore;
  keyring: KeyringApi;
  feedStore: FeedStore<FeedMessage>;
  spaceManager: SpaceManager;
  edgeConnection?: EdgeConnection;
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  devicePresenceAnnounceInterval?: number;
  devicePresenceOfflineTimeout?: number;
  /** See {@link DataSpaceManagerRuntimeProps.automergeCredentials}. Off by default. */
  automergeCredentials?: boolean;
};

/**
 * Resolves the active identity when it becomes available.
 */
export type IdentityProvider = () => Identity;

/**
 * Effect service tag for {@link IdentityProvider}.
 */
export class IdentityProviderService extends EffectContext.Service<IdentityProviderService, IdentityProvider>()(
  '@dxos/client-services/IdentityProvider',
) {}

/**
 * Builds an {@link IdentityProvider} from an {@link IdentityManager}.
 */
export const identityProviderFromManager =
  (identityManager: IdentityManager): IdentityProvider =>
  () =>
    identityManager.identity ?? failUndefined();

/**
 * Effect service tag for {@link IdentityManager}.
 */
export class IdentityManagerService extends EffectContext.Service<IdentityManagerService, IdentityManager>()(
  '@dxos/client-services/IdentityManager',
) {}

// TODO(dmaretskyi): Rename: represents the peer's state machine.
export class IdentityManager {
  readonly stateUpdate = new Event();

  private readonly _metadataStore: IMetadataStore;
  private readonly _keyring: KeyringApi;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _spaceManager: SpaceManager;
  /**
   * Set late by the service stack: `EchoHostLayer` already depends on this manager for its peer id,
   * so taking the host as a constructor dependency would make the layer graph circular. Anchoring is
   * driven by whichever of the two arrives last.
   */
  private _echoHost: EchoHost | undefined;
  /** Root the inviting device named, adopted once the identity is accepted. */
  private _pendingHaloSpaceRootUrl: string | undefined;
  private readonly _devicePresenceAnnounceInterval: number;
  private readonly _devicePresenceOfflineTimeout: number;
  private readonly _automergeCredentials: boolean;
  private readonly _edgeConnection: EdgeConnection | undefined;
  private readonly _edgeFeatures: Runtime_Client_EdgeFeatures | undefined;

  private _identity?: Identity;
  /** Owns the HALO anchoring subscriptions, which outlive any single open() call. */
  private readonly _ctx = new Context();

  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor(params: IdentityManagerProps) {
    this._metadataStore = params.metadataStore;
    this._keyring = params.keyring;
    this._feedStore = params.feedStore;
    this._spaceManager = params.spaceManager;
    this._edgeConnection = params.edgeConnection;
    this._edgeFeatures = params.edgeFeatures;
    this._devicePresenceAnnounceInterval = params.devicePresenceAnnounceInterval ?? DEVICE_PRESENCE_ANNOUNCE_INTERVAL;
    this._devicePresenceOfflineTimeout = params.devicePresenceOfflineTimeout ?? DEVICE_PRESENCE_OFFLINE_TIMEOUT;
    this._automergeCredentials = params.automergeCredentials ?? false;
  }

  get identity() {
    return this._identity;
  }

  /**
   * Supplies the echo host used to anchor the HALO space on a root document. Anchors immediately when
   * an identity is already open, since the two are wired in either order.
   */
  async setEchoHost(echoHost: EchoHost): Promise<void> {
    this._echoHost = echoHost;
    if (this._identity) {
      await this._anchorHaloOnRootDocument(this._ctx, this._identity);
    }
  }

  @Trace.span({ showInBrowserTimeline: true })
  async open(ctx: Context): Promise<void> {
    log('opening identity manager');

    const identityRecord = this._metadataStore.getIdentityRecord();
    log('identity record', { identityRecord });
    if (identityRecord) {
      this._identity = await this._constructIdentity(identityRecord);
      await this._identity.open(ctx);
      await this._identity.ready();
      await this._anchorHaloOnRootDocument(this._ctx, this._identity);
      log.trace('dxos.halo.identity', {
        identityKey: identityRecord.identityKey,
        displayName: this._identity.profileDocument?.displayName,
      });

      this.stateUpdate.emit();
    }
    log('opened identity manager');
  }

  async close(ctx: Context): Promise<void> {
    await this._ctx.dispose();
    await this._identity?.close(ctx);
  }

  async createIdentity({ profile, deviceProfile }: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
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
    await identity.open(ctx ?? Context.default());

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

      if (profile) {
        credentials.push(await generator.createProfileCredential(profile));
      }

      // Device authorization (writes device chain).
      // NOTE: This credential is written last. This is a hack to make sure that display name is set before identity is "ready".
      credentials.push(await generator.createDeviceAuthorization(identityRecord.deviceKey));

      // Write device metadata to profile.
      credentials.push(
        await generator.createDeviceProfile({
          ...this.createDefaultDeviceProfile(),
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
    await this._identity.ready();
    await this._anchorHaloOnRootDocument(this._ctx, this._identity);
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

  createDefaultDeviceProfile(): DeviceProfileDocument {
    // See TODOs in credentials.proto.
    let type: DeviceType;
    if (isNode()) {
      type = DeviceType.AGENT;
    } else {
      if (platform.name?.startsWith('iOS') || platform.name?.startsWith('Android')) {
        type = DeviceType.MOBILE;
      } else if (isTauri() || !platform.name) {
        // Tauri's __TAURI__ global isn't available in web workers. Fallback: WKWebView
        // (Tauri on macOS) reports null for platform.name; all standard browsers don't.
        type = DeviceType.NATIVE;
      } else {
        type = DeviceType.BROWSER;
      }
    }

    const os = platform.os?.family === 'OS X' ? 'macOS' : platform.os?.family;
    const name = type === DeviceType.NATIVE || type === DeviceType.MOBILE ? 'App' : platform.name;

    return {
      type,
      platform: name,
      platformVersion: platform.version,
      architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
      os,
      osVersion: platform.os?.version,
    };
  }

  /**
   * Prepare an identity object as the first step of acceptIdentity flow.
   */
  async prepareIdentity(params: JoinIdentityProps, ctx?: Context) {
    this._pendingHaloSpaceRootUrl = params.haloSpaceRootUrl;
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
    await identity.open(ctx ?? Context.default());
    return { identity, identityRecord };
  }

  /**
   * Accept an existing identity. Expects its device key to be authorized (now or later).
   */
  public async acceptIdentity(
    identity: Identity,
    identityRecord: IdentityRecord,
    profile?: DeviceProfileDocument,
  ): Promise<void> {
    this._identity = identity;

    // Identity becomes ready after device chain is replicated. Wait for it before storing the record.
    await this._identity.ready();
    await this._metadataStore.setIdentityRecord(identityRecord);

    log.trace('dxos.halo.identity', {
      identityKey: this._identity!.identityKey,
      displayName: this._identity.profileDocument?.displayName,
    });

    await this.updateDeviceProfile({
      ...this.createDefaultDeviceProfile(),
      ...profile,
    });
    await this._anchorHaloOnRootDocument(this._ctx, this._identity);
    this.stateUpdate.emit();

    log('accepted identity', { identityKey: identity.identityKey, deviceKey: identity.deviceKey });
  }

  /**
   * Update the profile document of an existing identity.
   */
  async updateProfile(profile: ProfileDocument): Promise<ProfileDocument> {
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

  async updateDeviceProfile(profile: DeviceProfileDocument): Promise<Device> {
    invariant(this._identity, 'Identity not initialized.');

    // TODO(nf): CredentialGenerator doesn't work when not updating own device.
    // const generator = new CredentialGenerator(this._keyring, this._identity.identityKey, this._identity.deviceKey);
    // const credential = await generator.createDeviceProfile(profile);

    const credential = await this._identity.getDeviceCredentialSigner().createCredential({
      subject: this._identity.deviceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.DeviceProfile',
        profile,
      },
    });

    const receipt = await this._identity.controlPipeline.writer.write({ credential: { credential } });
    await this._identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
    this.stateUpdate.emit();
    return {
      deviceKey: this._identity.deviceKey,
      kind: DeviceKind.CURRENT,
      presence: Device.PresenceState.ONLINE,
      profile,
    };
  }

  private async _constructIdentity(identityRecord: IdentityRecord): Promise<Identity> {
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
        identityKey: identityRecord.identityKey,
        peerKey: identityRecord.deviceKey,
        credentialProvider: createAuthProvider(createCredentialSignerWithKey(this._keyring, identityRecord.deviceKey)),
        credentialAuthenticator: deferFunction(() => identity.authVerifier.verifier),
      },
      gossip,
      identityKey: identityRecord.identityKey,
    });
    await space.setControlFeed(controlFeed);
    await space.setDataFeed(dataFeed);

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

    // TODO(mykola): Set new timeframe on a write to a feed.
    if (identityRecord.haloSpace.controlTimeframe) {
      identity.controlPipeline.state.setTargetTimeframe(identityRecord.haloSpace.controlTimeframe);
    }

    identity.stateUpdate.on(() => this.stateUpdate.emit());
    return identity;
  }

  /**
   * Gives the HALO space a space root document and mirrors its credential chain into a credentials
   * document, so the chain replicates as automerge rather than only as a control feed.
   *
   * The space keeps its key-derived id, exactly as a data space does. That is not a
   * migration compromise here as it is for data spaces: recovery reconstructs the HALO space from
   * `haloSpaceKey` alone (the only identifier EDGE returns), so a root-derived id would leave a
   * recovering device computing an id no replicated document belongs to.
   */
  private async _anchorHaloOnRootDocument(ctx: Context, identity: Identity): Promise<void> {
    // Opt-in: without the flag the HALO keeps its control feed and grows no documents.
    if (!this._echoHost || !this._automergeCredentials) {
      return;
    }
    const echoHost = this._echoHost;

    const spaceId = identity.haloSpaceId;
    try {
      if (!echoHost.getSpaceRootRefs(spaceId)) {
        const adopted = this._pendingHaloSpaceRootUrl;
        if (adopted !== undefined && isValidAutomergeUrl(adopted)) {
          // A second root over the same space would leave the two devices disagreeing about which
          // document carries the chain, so the joining device takes the one the inviter named — and
          // mints nothing when it cannot, since halo documents have no replication path between
          // devices yet and the root may simply never arrive.
          await echoHost.adoptSpaceRoot(ctx, spaceId, adopted).catch((err) => {
            log.warn('halo space root named by the inviting device is not available', { spaceId, adopted, err });
          });
          return;
        } else {
          // HALO has never had a directory — its data has always lived in the control feed — so one
          // is created here to give the root something to point at.
          if (!echoHost.spaceIds.includes(spaceId)) {
            await echoHost.createSpaceRoot(ctx, identity.haloSpaceKey);
          }

          const refs = await echoHost.migrateSpaceToRootDocument(ctx, spaceId);
          if (!refs) {
            return;
          }

          log('anchored halo space on a root document', { spaceId, refs });
        }
      }

      const refs = echoHost.getSpaceRootRefs(spaceId);
      if (refs) {
        identity.setHaloSpaceRootUrl(refs.spaceRootDocUrl);
      }

      const store = await openCredentialsDocument(ctx, echoHost, spaceId);
      for (const credential of identity.space.spaceState.credentials) {
        store.append(credential);
      }
      ctx.onDispose(identity.space.credentialProcessed.on((credential) => store.append(credential)));

      // The document feeds the same state machine the feed does; processing is idempotent by
      // credential id, so both sources can run during the migration window.
      store.subscribe(ctx, (credential) => identity.space.processDocumentCredential(credential));
    } catch (err) {
      log.warn('failed to anchor the halo space on a root document', { spaceId, err });
    }
  }

  private async _constructSpace({ spaceRecord, swarmIdentity, identityKey, gossip }: ConstructSpaceProps) {
    return this._spaceManager.constructSpace({
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
      onDelegatedInvitationStatusChange: async () => {}, // TODO: will be used for recovery keys
      onMemberRolesChanged: async () => {}, // TODO: will be used for device revocation
    });
  }
}

export type IdentityManagerLayerOptions = Pick<
  IdentityManagerProps,
  'devicePresenceAnnounceInterval' | 'devicePresenceOfflineTimeout' | 'edgeFeatures' | 'automergeCredentials'
>;

/**
 * Effect Layer constructing an {@link IdentityManager} from ambient service dependencies.
 */
export const IdentityManagerLayer = (
  options: IdentityManagerLayerOptions = {},
): Layer.Layer<
  IdentityManagerService,
  never,
  IMetadataStoreService | KeyringApiService | FeedStoreService | SpaceManagerService
> =>
  Layer.effect(
    IdentityManagerService,
    Effect.gen(function* () {
      const metadataStore = yield* IMetadataStoreService;
      const keyring = yield* KeyringApiService;
      const feedStore = yield* FeedStoreService;
      const spaceManager = yield* SpaceManagerService;
      const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);
      return new IdentityManager({
        metadataStore,
        keyring,
        feedStore,
        spaceManager,
        edgeConnection: Option.getOrUndefined(edgeConnection),
        ...options,
      });
    }),
  );
