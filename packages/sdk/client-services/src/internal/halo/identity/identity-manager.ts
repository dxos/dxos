//
// Copyright 2022 DXOS.org
//
import { isValidAutomergeUrl } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import platform from 'platform';

import { Event } from '@dxos/async';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import { Context } from '@dxos/context';
import {
  CredentialGenerator,
  createCredentialSignerWithKey,
  createDidFromIdentityKey,
  credentialPayload,
} from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type EchoHost } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import { EffectEx, Hook } from '@dxos/effect';
import { type HypercoreStore, HypercoreStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { fromPublicKey, fromTimeframe, requirePublicKey, toTimeframe } from '@dxos/protocols/buf';
import {
  type Device,
  Device_PresenceState,
  DeviceKind,
  DeviceSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';
import { type FeedMessage } from '@dxos/protocols/buf/dxos/echo/feed_pb';
import {
  type IdentityRecord,
  IdentityRecordSchema,
  type SpaceMetadata,
  SpaceMetadataSchema,
} from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import {
  AdmittedFeed_Designation,
  type Credential,
  type DeviceProfileDocument,
  DeviceProfileDocumentSchema,
  DeviceProfileSchema,
  DeviceType,
  IdentityProfileSchema,
  type ProfileDocument,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { Timeframe } from '@dxos/timeframe';
import { trace as Trace } from '@dxos/tracing';
import { deferFunction, isNode, isTauri } from '@dxos/util';

import * as Auth from '../../../Auth.ts';
import * as IdentityContract from '../../../contracts/identity.ts';
import { openCredentialsDocument } from '../../../CredentialsDocument.ts';
import * as Events from '../../../Events.ts';
import { Identity } from '../../../Identity.ts';
import { type SpaceManager, SpaceManagerService, type SwarmIdentity } from '../../echo/space/index.ts';
import { type IMetadataStore, IMetadataStoreService } from '../../kernel/metadata/index.ts';
import { type Options } from '../interface.ts';

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
  hypercoreStore: HypercoreStore<FeedMessage>;
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
 * Builds an {@link IdentityProvider} from an {@link IdentityManager}.
 */
export const identityProviderFromManager =
  (identityManager: IdentityContract.Manager): IdentityContract.Provider =>
  () =>
    identityManager.identity ?? failUndefined();

// TODO(dmaretskyi): Rename: represents the peer's state machine.
export class IdentityManager {
  readonly stateUpdate = new Event();

  private readonly _metadataStore: IMetadataStore;
  private readonly _keyring: KeyringApi;
  private readonly _hypercoreStore: HypercoreStore<FeedMessage>;
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
  /**
   * Owns the HALO anchoring subscriptions, which outlive any single open() call. Replaced on
   * {@link deleteIdentity}, since a disposed context runs new `onDispose` callbacks immediately and
   * would tear down the next identity's subscriptions as they are registered.
   */
  private _ctx = new Context();

  // TODO(dmaretskyi): Perhaps this should take/generate the peerKey outside of an initialized identity.
  constructor(params: IdentityManagerProps) {
    this._metadataStore = params.metadataStore;
    this._keyring = params.keyring;
    this._hypercoreStore = params.hypercoreStore;
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

  /**
   * Closes the identity and drops its persisted record, so the next open starts without one.
   * The identity's storage (feeds, automerge documents, keys) is wiped separately by the reset
   * chain — this only tears down the live identity and the metadata that would resurrect it.
   */
  async deleteIdentity(ctx: Context): Promise<void> {
    const identity = this._identity;
    if (identity) {
      log('deleting identity', { identityKey: identity.identityKey });
      // Dropped before teardown so anything observing `stateUpdate` cannot read a half-closed identity.
      this._identity = undefined;
      await this._ctx.dispose();
      this._ctx = new Context();
      await identity.close(ctx).catch((err) => log.warn('identity teardown failed; deleting anyway', { err }));
    } else {
      log('no live identity to delete');
    }

    // Unconditional, so a call that failed here is retried rather than leaving the persisted record
    // to resurrect an identity the caller already deleted.
    await this._metadataStore.clear();
    this.stateUpdate.emit();
    log('deleted identity');
  }

  async createIdentity({ profile, deviceProfile }: CreateIdentityOptions = {}, ctx?: Context): Promise<Identity> {
    invariant(!this._identity, 'Identity already exists.');
    log('creating identity...');

    const controlFeedKey = await this._keyring.createKey();
    const identityRecord: IdentityRecord = create(IdentityRecordSchema, {
      identityKey: fromPublicKey(await this._keyring.createKey()),
      deviceKey: fromPublicKey(await this._keyring.createKey()),
      haloSpace: create(SpaceMetadataSchema, {
        key: fromPublicKey(await this._keyring.createKey()),
        genesisFeedKey: fromPublicKey(controlFeedKey),
        controlFeedKey: fromPublicKey(controlFeedKey),
        dataFeedKey: fromPublicKey(await this._keyring.createKey()),
      }),
    });

    const identity = await this._constructIdentity(identityRecord);
    await identity.open(ctx ?? Context.default());

    {
      const identityKey = requirePublicKey(identityRecord.identityKey);
      const deviceKey = requirePublicKey(identityRecord.deviceKey);
      const haloSpace = identityRecord.haloSpace;
      invariant(haloSpace, 'Halo space metadata is required.');
      const generator = new CredentialGenerator(this._keyring, identityKey, deviceKey);
      const credentials = [
        // Space genesis.
        ...(await generator.createSpaceGenesis(
          requirePublicKey(haloSpace.key),
          requirePublicKey(haloSpace.genesisFeedKey),
        )),

        // Feed admission.
        await generator.createFeedAdmission(
          requirePublicKey(haloSpace.key),
          requirePublicKey(haloSpace.dataFeedKey),
          AdmittedFeed_Designation.DATA,
        ),
      ];

      if (profile) {
        credentials.push(await generator.createProfileCredential(profile));
      }

      // Device authorization (writes device chain).
      // NOTE: This credential is written last. This is a hack to make sure that display name is set before identity is "ready".
      credentials.push(await generator.createDeviceAuthorization(deviceKey));

      // Write device metadata to profile.
      credentials.push(
        await generator.createDeviceProfile({
          ...this.createDefaultDeviceProfile(),
          ...deviceProfile,
        }),
      );
      for (const credential of credentials) {
        await identity.controlPipeline.writer.write(credentialPayload(credential));
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

    return create(DeviceProfileDocumentSchema, {
      type,
      platform: name,
      platformVersion: platform.version,
      architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
      os,
      osVersion: platform.os?.version,
    });
  }

  /**
   * Prepare an identity object as the first step of acceptIdentity flow.
   */
  async prepareIdentity(params: JoinIdentityProps, ctx?: Context) {
    this._pendingHaloSpaceRootUrl = params.haloSpaceRootUrl;
    log('accepting identity', { params });
    invariant(!this._identity, 'Identity already exists.');

    const identityRecord: IdentityRecord = create(IdentityRecordSchema, {
      identityKey: fromPublicKey(params.identityKey),
      deviceKey: fromPublicKey(params.deviceKey),
      haloSpace: create(SpaceMetadataSchema, {
        key: fromPublicKey(params.haloSpaceKey),
        genesisFeedKey: fromPublicKey(params.haloGenesisFeedKey),
        controlFeedKey: fromPublicKey(params.controlFeedKey),
        dataFeedKey: fromPublicKey(params.dataFeedKey),
        controlTimeframe: params.controlTimeframe && fromTimeframe(params.controlTimeframe),
      }),
    });
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
      assertion: create(IdentityProfileSchema, { profile }),
    });

    const receipt = await this._identity.controlPipeline.writer.write(credentialPayload(credential));
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
      assertion: create(DeviceProfileSchema, { profile }),
    });

    const receipt = await this._identity.controlPipeline.writer.write(credentialPayload(credential));
    await this._identity.controlPipeline.state.waitUntilTimeframe(new Timeframe([[receipt.feedKey, receipt.seq]]));
    this.stateUpdate.emit();
    return create(DeviceSchema, {
      deviceKey: fromPublicKey(this._identity.deviceKey),
      kind: DeviceKind.CURRENT,
      presence: Device_PresenceState.ONLINE,
      profile,
    });
  }

  private async _constructIdentity(identityRecord: IdentityRecord): Promise<Identity> {
    invariant(!this._identity);
    log('constructing identity', { identityRecord });

    const identityKey = requirePublicKey(identityRecord.identityKey);
    const deviceKey = requirePublicKey(identityRecord.deviceKey);
    const haloSpace = identityRecord.haloSpace;
    invariant(haloSpace, 'Halo space metadata is required.');

    const gossip = new Gossip({
      localPeerId: deviceKey,
    });
    const presence = new Presence({
      announceInterval: this._devicePresenceAnnounceInterval,
      offlineTimeout: this._devicePresenceOfflineTimeout,
      identityKey: deviceKey,
      gossip,
    });

    // Must be created before the space so the feeds are writable.
    const controlFeed = await this._hypercoreStore.openHypercore(requirePublicKey(haloSpace.controlFeedKey), {
      writable: true,
    });
    const dataFeed = await this._hypercoreStore.openHypercore(requirePublicKey(haloSpace.dataFeedKey), {
      writable: true,
      sparse: true,
    });

    const space = await this._constructSpace({
      spaceRecord: haloSpace,
      swarmIdentity: {
        identityKey,
        peerKey: deviceKey,
        credentialProvider: Auth.createAuthProvider(createCredentialSignerWithKey(this._keyring, deviceKey)),
        credentialAuthenticator: deferFunction(() => identity.authVerifier.verifier),
      },
      gossip,
      identityKey,
    });
    await space.setControlFeed(controlFeed);
    await space.setDataFeed(dataFeed);

    const did = await createDidFromIdentityKey(identityKey);
    const identity: Identity = new Identity({
      space,
      presence,
      signer: this._keyring,
      did,
      identityKey,
      deviceKey,
      edgeConnection: this._edgeConnection,
      edgeFeatures: this._edgeFeatures,
    });
    log('done', { identityKey });

    // TODO(mykola): Set new timeframe on a write to a feed.
    if (haloSpace.controlTimeframe) {
      identity.controlPipeline.state.setTargetTimeframe(toTimeframe(haloSpace.controlTimeframe));
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
      metadata: create(SpaceMetadataSchema, {
        key: spaceRecord.key,
        genesisFeedKey: spaceRecord.genesisFeedKey,
      }),
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
  IdentityContract.ManagerService,
  never,
  Hook.Controller | IMetadataStoreService | KeyringApiService | HypercoreStoreService | SpaceManagerService
> =>
  Layer.effect(
    IdentityContract.ManagerService,
    Effect.gen(function* () {
      const metadataStore = yield* IMetadataStoreService;
      const keyring = yield* KeyringApiService;
      const hypercoreStore = yield* HypercoreStoreService;
      const spaceManager = yield* SpaceManagerService;
      const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);
      const identityManager = new IdentityManager({
        metadataStore,
        keyring,
        hypercoreStore,
        spaceManager,
        edgeConnection: Option.getOrUndefined(edgeConnection),
        ...options,
      });

      const ctx = yield* EffectEx.contextFromScope();
      yield* Effect.addFinalizer(() => Effect.promise(() => identityManager.close(Context.default())));
      yield* Hook.on(
        Events.StorageReady,
        Effect.fn('IdentityManager.onStorageReady')(function* () {
          yield* Effect.promise(() => identityManager.open(ctx));
          yield* Hook.emit(Events.IdentityLoaded, { identity: identityManager.identity });
        }),
      );
      return identityManager;
    }),
  );

export const IdentityManagerSpec = (options: Options) =>
  LayerSpec.make(
    {
      affinity: 'application',
      requires: [Hook.Controller, IMetadataStoreService, KeyringApiService, HypercoreStoreService, SpaceManagerService],
      provides: [IdentityContract.ManagerService],
    },
    () =>
      IdentityManagerLayer({
        devicePresenceOfflineTimeout: options.devicePresenceOfflineTimeout,
        devicePresenceAnnounceInterval: options.devicePresenceAnnounceInterval,
        edgeFeatures: options.edgeFeatures,
        automergeCredentials: options.automergeCredentials,
      }),
  );

/**
 * Provides the identity provider from the resolved manager.
 */
export const identityProviderLayer = Layer.effect(
  IdentityContract.ProviderService,
  Effect.gen(function* () {
    const identityManager = yield* IdentityContract.ManagerService;
    return identityProviderFromManager(identityManager);
  }),
);

export const IdentityProviderSpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [IdentityContract.ManagerService],
    provides: [IdentityContract.ProviderService],
  },
  () => identityProviderLayer,
);
