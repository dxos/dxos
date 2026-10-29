//
// Copyright 2022 DXOS.org
//
import { type AutomergeUrl, isValidAutomergeUrl } from '@automerge/automerge-repo';
import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import platform from 'platform';

import { Event, scheduleTask, sleepWithContext } from '@dxos/async';
import { Context } from '@dxos/context';
import {
  CredentialGenerator,
  createCredentialSignerWithKey,
  createDidFromIdentityKey,
  credentialPayload,
} from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';
import { type EchoHost, type EdgeAutomergeReplicator } from '@dxos/echo-host';
import { type EdgeConnection, EdgeConnectionService } from '@dxos/edge-client';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Hook from '@dxos/effect/Hook';
import { type HypercoreStore, HypercoreStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { PublicKey, type SpaceId } from '@dxos/keys';
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
import { deferFunction, isNode, isTauri, markMilestone } from '@dxos/util';

import * as Auth from '../../Auth.ts';
import * as IdentityContract from '../../contracts/identity.ts';
import { openCredentialsDocument } from '../../CredentialsDocument.ts';
import { lookupEdgeSpaceRoot } from '../../EdgeSpaceRoot.ts';
import * as Events from '../../Events.ts';
import { Identity } from '../../Identity.ts';
import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import { type SpaceManager, SpaceManagerService, type SwarmIdentity } from '../space/index.ts';

const DEVICE_PRESENCE_ANNOUNCE_INTERVAL = 10_000;
const DEVICE_PRESENCE_OFFLINE_TIMEOUT = 20_000;

/** How long one adoption attempt waits for an edge-minted HALO root to replicate before failing it. */
const EDGE_ROOT_FETCH_TIMEOUT = 5_000;

/** Backoff bounds for asking edge to migrate a HALO it has not processed far enough to anchor yet. */
const EDGE_MIGRATION_RETRY_INITIAL = 500;
const EDGE_MIGRATION_RETRY_MAX = 8_000;

/** Backoff bounds for re-anchoring a HALO whose root lookup failed or did not replicate in time. */
const HALO_ANCHOR_RETRY_INITIAL = 500;
const HALO_ANCHOR_RETRY_MAX = 30_000;

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
  /** Set late, like {@link _echoHost}; see {@link setEdgeServices}. */
  private _edgeHttpClient: IdentityContract.EdgeServices['edgeHttpClient'];
  private _echoEdgeReplicator: EdgeAutomergeReplicator | undefined;
  /** The HALO space connected to edge document replication, so it is connected once. */
  private _haloReplicationSpaceId: SpaceId | undefined;
  /** The HALO space whose credentials are mirrored, so a repeated anchor does not subscribe twice. */
  private _haloMirroredSpaceId: SpaceId | undefined;
  /** Serializes anchoring, which open, the late setters and migration can each trigger. */
  private _anchorQueue: Promise<void> = Promise.resolve();
  /** Delay before the next re-anchor of an unsettled HALO; past the max it stops until the next open. */
  private _haloAnchorRetryDelay = HALO_ANCHOR_RETRY_INITIAL;
  private _haloAnchorRetryPending = false;
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

  /**
   * Supplies the edge services the HALO uses to adopt a root edge holds and replicate its documents.
   * Anchors immediately when an identity is already open, since they arrive after it.
   */
  async setEdgeServices({ edgeHttpClient, echoEdgeReplicator }: IdentityContract.EdgeServices): Promise<void> {
    this._edgeHttpClient = edgeHttpClient;
    this._echoEdgeReplicator = echoEdgeReplicator;
    if (this._identity) {
      await this._anchorHaloOnRootDocument(this._ctx, this._identity);
    }
  }

  /**
   * Has edge migrate the HALO onto a space root document it mints from the chain it holds, then
   * adopts that root. Every device of the identity gets the same root because edge records it once.
   * Idempotent.
   */
  async migrateHaloRootOnEdge(ctx: Context): Promise<AutomergeUrl> {
    const identity = this._identity;
    invariant(identity, 'Identity not initialized.');
    invariant(this._edgeHttpClient, 'Migrating the HALO on edge requires an edge connection.');
    invariant(this._echoHost, 'Migrating the HALO requires the echo host.');
    const edgeHttpClient = this._edgeHttpClient;
    const echoHost = this._echoHost;
    const spaceId = identity.haloSpaceId;

    let haloSpaceRootUrl: AutomergeUrl | undefined;
    let delay = EDGE_MIGRATION_RETRY_INITIAL;
    while (haloSpaceRootUrl === undefined) {
      try {
        const { rootDocumentUrl } = await edgeHttpClient.migrateSpaceRoot(ctx, spaceId);
        invariant(isValidAutomergeUrl(rootDocumentUrl), `Edge returned an invalid HALO root: ${rootDocumentUrl}`);
        haloSpaceRootUrl = rootDocumentUrl;
      } catch (err) {
        // Edge answers "not yet" until it has processed the HALO feed far enough to anchor it.
        if (delay > EDGE_MIGRATION_RETRY_MAX) {
          throw err;
        }
        log('edge cannot migrate the HALO yet, retrying', { spaceId, delay, err });
        await sleepWithContext(ctx, delay);
        delay *= 2;
      }
    }

    const existing = echoHost.getSpaceRootRefs(spaceId);
    if (existing) {
      invariant(
        existing.spaceRootDocUrl === haloSpaceRootUrl,
        `HALO ${spaceId} is anchored on ${existing.spaceRootDocUrl}, but edge holds ${haloSpaceRootUrl}.`,
      );
    } else {
      // Adoption waits on the root replicating from edge, so it is retried rather than failed on the first miss.
      delay = EDGE_MIGRATION_RETRY_INITIAL;
      while (!(await this._adoptHaloRoot(ctx, identity, haloSpaceRootUrl))) {
        invariant(delay <= EDGE_MIGRATION_RETRY_MAX, `HALO root ${haloSpaceRootUrl} did not replicate from edge.`);
        await sleepWithContext(ctx, delay);
        delay *= 2;
      }
    }

    await this._anchorHaloOnRootDocument(this._ctx, identity);
    this.stateUpdate.emit();
    return haloSpaceRootUrl;
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
      markMilestone('identity.ready');
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
      this._haloMirroredSpaceId = undefined;
      this._haloAnchorRetryDelay = HALO_ANCHOR_RETRY_INITIAL;
      this._haloAnchorRetryPending = false;
      if (this._haloReplicationSpaceId) {
        const replicatedSpaceId = this._haloReplicationSpaceId;
        this._haloReplicationSpaceId = undefined;
        await this._echoEdgeReplicator
          ?.disconnectFromSpace(replicatedSpaceId)
          .catch((err) => log.warn('failed to disconnect the HALO from edge replication', { err }));
      }
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
    markMilestone('identity.ready');
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
    markMilestone('identity.ready');
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
  private _anchorHaloOnRootDocument(ctx: Context, identity: Identity): Promise<void> {
    const anchored = this._anchorQueue.then(() => this._anchorHaloOnce(ctx, identity));
    this._anchorQueue = anchored.catch(() => {});
    return anchored;
  }

  private async _anchorHaloOnce(ctx: Context, identity: Identity): Promise<void> {
    if (!this._echoHost || this._identity !== identity) {
      return;
    }
    const echoHost = this._echoHost;

    const spaceId = identity.haloSpaceId;
    try {
      if (!echoHost.getSpaceRootRefs(spaceId)) {
        // A root the inviting device named, or one edge holds, is the HALO's only root: adopting it
        // comes before anything local could mint a second one, whatever the flag says.
        const pending = this._pendingHaloSpaceRootUrl;
        const edgeRoot =
          pending !== undefined && isValidAutomergeUrl(pending)
            ? ({ kind: 'found', url: pending } as const)
            : await lookupEdgeSpaceRoot(this._ctx, this._edgeHttpClient, spaceId);
        if (edgeRoot.kind === 'found') {
          if (!(await this._adoptHaloRoot(ctx, identity, edgeRoot.url))) {
            this._scheduleHaloAnchorRetry(identity);
            return;
          }
        } else {
          // Asked again whatever the flag says: a root EDGE holds is adopted with the flag off too.
          if (edgeRoot.kind === 'unavailable') {
            this._scheduleHaloAnchorRetry(identity);
            return;
          }
          // Minting a root locally is the opt-in behaviour.
          if (!this._automergeCredentials) {
            return;
          }

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
      if (!refs) {
        return;
      }
      identity.setHaloSpaceRootUrl(refs.spaceRootDocUrl);
      this._haloAnchorRetryDelay = HALO_ANCHOR_RETRY_INITIAL;
      await this._connectHaloReplication(ctx, identity);

      // An anchored HALO mirrors whatever the flag says, or its document falls behind after a reload.
      if (this._haloMirroredSpaceId === spaceId) {
        return;
      }
      const store = await openCredentialsDocument(ctx, echoHost, spaceId);
      this._haloMirroredSpaceId = spaceId;
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

  /**
   * Re-anchors a HALO left unsettled, since nothing else attempts it again before the next open: a
   * root that replicates late, or an EDGE that answers later, arrives without any event to react to.
   */
  private _scheduleHaloAnchorRetry(identity: Identity): void {
    if (this._haloAnchorRetryPending || this._haloAnchorRetryDelay > HALO_ANCHOR_RETRY_MAX) {
      return;
    }
    this._haloAnchorRetryPending = true;
    scheduleTask(
      this._ctx,
      () => {
        this._haloAnchorRetryPending = false;
        void this._anchorHaloOnRootDocument(this._ctx, identity).catch((err) => log.catch(err));
      },
      this._haloAnchorRetryDelay,
    );
    this._haloAnchorRetryDelay *= 2;
  }

  /**
   * Adopts a HALO root named by an inviting device or held by edge, fetching it over edge replication.
   * @returns Whether the root was adopted; false leaves it for the next open or a retrying caller.
   */
  private async _adoptHaloRoot(ctx: Context, identity: Identity, haloSpaceRootUrl: AutomergeUrl): Promise<boolean> {
    const echoHost = this._echoHost;
    invariant(echoHost, 'Adopting a HALO root requires the echo host.');
    const spaceId = identity.haloSpaceId;
    try {
      // The root exists on edge and other devices, so this device has to replicate before it can load it.
      await this._connectHaloReplication(ctx, identity);
      const refs = await echoHost.adoptSpaceRoot(ctx, spaceId, haloSpaceRootUrl, {
        fetchFromNetwork: true,
        timeout: EDGE_ROOT_FETCH_TIMEOUT,
      });
      identity.setHaloSpaceRootUrl(refs.spaceRootDocUrl);
      this._pendingHaloSpaceRootUrl = undefined;
      log('adopted the HALO root', { spaceId, refs });
      return true;
    } catch (err) {
      log.warn('HALO root is not available yet', { spaceId, haloSpaceRootUrl, err });
      return false;
    }
  }

  /** Connects the HALO space to edge document replication, once per identity. */
  private async _connectHaloReplication(ctx: Context, identity: Identity): Promise<void> {
    if (!this._echoEdgeReplicator || this._haloReplicationSpaceId === identity.haloSpaceId) {
      return;
    }
    await this._echoEdgeReplicator.connectToSpace(ctx, identity.haloSpaceId);
    this._haloReplicationSpaceId = identity.haloSpaceId;
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
