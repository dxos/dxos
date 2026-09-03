//
// Copyright 2022 DXOS.org
//

import { type Doc } from '@automerge/automerge';
import {
  type AutomergeUrl,
  type DocumentId,
  interpretAsDocumentId,
  isValidAutomergeUrl,
} from '@automerge/automerge-repo';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import { Event, scheduleTask, synchronized, trackLeaks } from '@dxos/async';
import { SpaceProperties } from '@dxos/client-protocol';
import { Context, LifecycleState, Resource, cancelWithContext } from '@dxos/context';
import {
  type CredentialSigner,
  type DelegateInvitationCredential,
  type MemberInfo,
  createAdmissionCredentials,
  getCredentialAssertion,
} from '@dxos/credentials';
import { Type } from '@dxos/echo';
import {
  DatabaseRoot,
  type EchoHost,
  EchoHostService,
  type EdgeAutomergeReplicator,
  EdgeAutomergeReplicatorService,
  type MeshEchoReplicator,
  MeshEchoReplicatorService,
  type SpaceRootRefs,
  findInlineObjectOfType,
} from '@dxos/echo-host';
import { type DatabaseDirectory, createIdFromSpaceKey } from '@dxos/echo-protocol';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
} from '@dxos/edge-client';
import { type FeedStore, FeedStoreService, writeMessages } from '@dxos/feed-store';
import { assertArgument, assertState, failedInvariant, invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { AlreadyJoinedError } from '@dxos/protocols';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';
import { Invitation, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
import { type FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { EdgeReplicationSetting, type SpaceMetadata } from '@dxos/protocols/proto/dxos/echo/metadata';
import {
  type Credential,
  MembershipPolicy,
  type ProfileDocument,
  SpaceMember,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import { type DelegateSpaceInvitation } from '@dxos/protocols/proto/dxos/halo/invitations';
import { type PeerState } from '@dxos/protocols/proto/dxos/mesh/presence';
import { type Teleport } from '@dxos/teleport';
import { Gossip, Presence } from '@dxos/teleport-extension-gossip';
import { type Timeframe } from '@dxos/timeframe';
import { trace } from '@dxos/tracing';
import { ComplexMap, deferFunction, forEachAsync } from '@dxos/util';

import { type Identity, IdentityProviderService, createAuthProvider } from '../identity/index.ts';
import { type InvitationsManager, InvitationsManagerService } from '../invitations/index.ts';
import { type IMetadataStore, IMetadataStoreService } from '../metadata/index.ts';
import {
  AuthStatus,
  CredentialServerExtension,
  type Space,
  type SpaceManager,
  SpaceManagerService,
  type SpaceProtocol,
  type SpaceProtocolSession,
} from '../space/index.ts';
import { openCredentialsDocument } from './credentials-document-store.ts';
import { DataSpace } from './data-space.ts';
import { spaceGenesis } from './genesis.ts';

const PRESENCE_ANNOUNCE_INTERVAL = 10_000;
const PRESENCE_OFFLINE_TIMEOUT = 20_000;

export interface SigningContext {
  identityKey: PublicKey;
  deviceKey: PublicKey;
  credentialSigner: CredentialSigner; // TODO(burdon): Already has keyring.
  recordCredential: (credential: Credential) => Promise<void>;
  // TODO(dmaretskyi): Should be a getter.
  getProfile: () => ProfileDocument | undefined;
}

/**
 * Resolves signing context when identity becomes available.
 */
export type SigningContextProvider = () => SigningContext;

/**
 * Effect service tag for {@link SigningContextProvider}.
 */
export class SigningContextProviderService extends EffectContext.Service<
  SigningContextProviderService,
  SigningContextProvider
>()('@dxos/client-services/SigningContextProvider') {}

/**
 * Builds a {@link SigningContextProvider} from an identity resolver.
 */
export const createSigningContextProvider =
  (getIdentity: () => Identity): SigningContextProvider =>
  () => {
    const identity = getIdentity();
    return {
      credentialSigner: identity.getIdentityCredentialSigner(),
      identityKey: identity.identityKey,
      deviceKey: identity.deviceKey,
      getProfile: () => identity.profileDocument,
      recordCredential: async (credential) => {
        await identity.controlPipeline.writer.write({ credential: { credential } });
      },
    };
  };

/**
 * Effect Layer providing {@link SigningContextProvider} from {@link IdentityProviderService}.
 */
export const SigningContextProviderLayer = Layer.effect(
  SigningContextProviderService,
  Effect.gen(function* () {
    const identityProvider = yield* IdentityProviderService;
    return createSigningContextProvider(identityProvider);
  }),
);

export type AcceptSpaceOptions = {
  spaceKey: PublicKey;
  genesisFeedKey: PublicKey;

  /** From the admitting `SpaceMember` credential; absent for a space still on its control feed. */
  spaceRootUrl?: string;

  /**
   * Latest known timeframe for the control pipeline.
   * We will try to catch up to this timeframe before starting the data pipeline.
   */
  controlTimeframe?: Timeframe;

  /**
   * Latest known timeframe for the data pipeline.
   * We will try to catch up to this timeframe before initializing the database.
   */
  dataTimeframe?: Timeframe;

  /** Tags assigned to the space member. */
  tags?: string[];
};

export type AdmitMemberOptions = {
  spaceKey: PublicKey;
  identityKey: PublicKey;
  role: SpaceMember.Role;
  profile?: ProfileDocument;
  delegationCredentialId?: PublicKey;
  tags?: string[];

  /** Successor to `genesisFeedKey`: what lets the admitted member replicate from this credential alone. */
  spaceRootUrl?: string;
};

export type DataSpaceManagerProps = {
  spaceManager: SpaceManager;
  metadataStore: IMetadataStore;
  keyring: KeyringApi;
  signingContextProvider: SigningContextProvider;
  feedStore: FeedStore<FeedMessage>;
  echoHost: EchoHost;
  invitationsManager: InvitationsManager;
  edgeConnection?: EdgeConnection;
  edgeHttpClient?: EdgeHttpClient;
  meshReplicator?: MeshEchoReplicator;
  echoEdgeReplicator?: EdgeAutomergeReplicator;
  runtimeProps?: DataSpaceManagerRuntimeProps;
  edgeFeatures?: Runtime_Client_EdgeFeatures;
};

export type DataSpaceManagerRuntimeProps = {
  spaceMemberPresenceAnnounceInterval?: number;
  spaceMemberPresenceOfflineTimeout?: number;
  activeEdgeNotarizationPollingInterval?: number;
  disableP2pReplication?: boolean;
  /**
   * If true, spaces that were previously SPACE_ACTIVE will be automatically activated on startup.
   * This is used in dedicated worker mode to restore space state after leader changeover.
   */
  autoActivateSpaces?: boolean;

  /**
   * Anchor spaces on a space root document and mirror credentials into a credentials document.
   * Off by default — a space then keeps its key-derived id and its control feed, as before.
   */
  automergeCredentials?: boolean;
};

export type CreateSpaceOptions = {
  /**
   * Anchor the space on a space root document, taking its id from that document instead of from the
   * space key. Defaults to the `automergeCredentials` runtime flag, which is off — so a space is
   * key-derived unless the flag opts in. Ignored for an imported space, which brings its own root.
   */
  useSpaceRootDocument?: boolean;

  rootUrl?: AutomergeUrl;
  documents?: Record<DocumentId, Uint8Array>;
  tags?: string[];
  membershipPolicy?: MembershipPolicy;
};

/** Backoff bounds for retrying an anchor that is waiting on replication or an unassigned directory. */
const ANCHOR_RETRY_INITIAL = 500;
const ANCHOR_RETRY_MAX = 30_000;

/** Backoff bounds for reporting a space root to edge; replication normally lands well inside this. */
const SPACE_ROOT_REPORT_RETRY_INITIAL = 500;
const SPACE_ROOT_REPORT_RETRY_MAX = 30_000;

@trackLeaks('open', 'close')
export class DataSpaceManager extends Resource {
  public readonly updated = new Event();

  private readonly _spaces = new ComplexMap<PublicKey, DataSpace>(PublicKey.hash);

  /** Spaces created legacy in this session; see {@link _anchorSpaceOnRootDocument}. */
  private readonly _legacyCreatedSpaces = new Set<SpaceId>();
  /** Roots named by an inviter, to adopt once they replicate; see {@link _anchorSpaceOnRootDocument}. */
  private readonly _pendingSpaceRootUrls = new Map<SpaceId, AutomergeUrl>();

  /**
   * Spaces whose close has begun. `DataSpace.isOpen` reads the inner space, which closes last, so it
   * still reads open through `preClose` — the window the anchor's background work resumes in.
   */
  private readonly _closingSpaces = new Set<SpaceId>();

  private readonly _spaceManager: SpaceManager;
  private readonly _metadataStore: IMetadataStore;
  private readonly _keyring: KeyringApi;
  private readonly _signingContextProvider: SigningContextProvider;
  private readonly _feedStore: FeedStore<FeedMessage>;
  private readonly _echoHost: EchoHost;
  private readonly _invitationsManager: InvitationsManager;
  private readonly _edgeConnection?: EdgeConnection = undefined;
  private readonly _edgeHttpClient?: EdgeHttpClient = undefined;
  private readonly _edgeFeatures?: Runtime_Client_EdgeFeatures = undefined;
  private readonly _meshReplicator?: MeshEchoReplicator = undefined;
  private readonly _echoEdgeReplicator?: EdgeAutomergeReplicator = undefined;
  private readonly _runtimeProps?: DataSpaceManagerRuntimeProps = undefined;

  /** Opt-in to the automerge-backed credential scheme; see {@link DataSpaceManagerRuntimeProps}. */
  private get _automergeCredentials(): boolean {
    return this._runtimeProps?.automergeCredentials ?? false;
  }

  constructor(params: DataSpaceManagerProps) {
    super();

    this._spaceManager = params.spaceManager;
    this._metadataStore = params.metadataStore;
    this._keyring = params.keyring;
    this._signingContextProvider = params.signingContextProvider;
    this._feedStore = params.feedStore;
    this._echoHost = params.echoHost;
    this._meshReplicator = params.meshReplicator;
    this._invitationsManager = params.invitationsManager;
    this._edgeConnection = params.edgeConnection;
    this._edgeFeatures = params.edgeFeatures;
    this._echoEdgeReplicator = params.echoEdgeReplicator;
    this._edgeHttpClient = params.edgeHttpClient;
    this._runtimeProps = params.runtimeProps;

    trace.diagnostic({
      id: 'spaces',
      name: 'Spaces',
      fetch: async () => {
        return Promise.all(
          Array.from(this._spaces.values()).map(async (space) => {
            const rootUrl = space.automergeSpaceState.rootUrl;
            using rootLease = rootUrl
              ? await this._echoHost.loadDoc<Doc<DatabaseDirectory>>(this._ctx, rootUrl as AutomergeUrl)
              : undefined;
            const rootDoc = rootLease?.doc();

            const properties = rootDoc && findInlineObjectOfType(rootDoc, Type.getTypename(SpaceProperties));

            return {
              key: space.key.toHex(),
              state: SpaceState[space.state],
              name: properties?.[1].data.name ?? null,
              inlineObjects: rootDoc ? Object.keys(rootDoc.objects ?? {}).length : null,
              linkedObjects: rootDoc ? Object.keys(rootDoc.links ?? {}).length : null,
              credentials: space.inner.spaceState.credentials.length,
              members: space.inner.spaceState.members.size,
              rootUrl,
            };
          }),
        );
      },
    });
  }

  private get signingContext(): SigningContext {
    return this._signingContextProvider();
  }

  // TODO(burdon): Remove.
  get spaces() {
    return this._spaces;
  }

  getSpaceById(spaceId: SpaceId): DataSpace | undefined {
    return [...this._spaces.values()].find((space) => space.id === spaceId);
  }

  @synchronized
  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  protected override async _open(ctx: Context): Promise<void> {
    log('open');
    log('metadata loaded', { spaces: this._metadataStore.spaces.length });

    const spacesToActivate: DataSpace[] = [];
    await forEachAsync(this._metadataStore.spaces, async (spaceMetadata) => {
      try {
        // Tombstoned spaces are never constructed, opened, or replicated.
        if (spaceMetadata.state === SpaceState.SPACE_DELETED || this.isSpaceDeleted(spaceMetadata.key)) {
          log('skipping deleted space', { spaceKey: spaceMetadata.key });
          return;
        }
        log('load space', { spaceMetadata });
        const space = await this._constructSpace(ctx, spaceMetadata);
        // Track spaces that were previously active for auto-activation (used in dedicated worker mode).
        if (this._runtimeProps?.autoActivateSpaces && spaceMetadata.state === SpaceState.SPACE_ACTIVE) {
          spacesToActivate.push(space);
        }
      } catch (err) {
        log.error('Error loading space', { spaceMetadata, err });
      }
    });

    // Auto-activate spaces that were previously active (used in dedicated worker mode after leader changeover).
    for (const space of spacesToActivate) {
      log('auto-activating space', { spaceKey: space.key });
      space.activate(ctx).catch((err) => {
        log.error('Error auto-activating space', { spaceKey: space.key, err });
      });
    }

    this.updated.emit();
  }

  @synchronized
  protected override async _close(ctx: Context): Promise<void> {
    log('close');
    for (const space of this._spaces.values()) {
      await space.close(ctx);
    }
    this._spaces.clear();
  }

  /**
   * Creates a new space writing the genesis credentials to the control feed.
   */
  @synchronized
  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  async createSpace(ctx: Context, options: CreateSpaceOptions = {}): Promise<DataSpace> {
    assertArgument(
      !!options.rootUrl === !!options.documents,
      'options',
      'root url must be required when providing documents',
    );

    assertState(this._lifecycleState === LifecycleState.OPEN, 'Not open.');

    const tags = options.tags ? Array.from(options.tags) : [];
    const spaceKey = await this._keyring.createKey();
    const controlFeedKey = await this._keyring.createKey();
    const dataFeedKey = await this._keyring.createKey();

    // An imported space brings its own root document, so it keeps the key-derived id.
    const anchorOnRootDocument =
      (options.useSpaceRootDocument ?? this._automergeCredentials) && !options.rootUrl && !options.documents;
    const createdSpace = anchorOnRootDocument
      ? await this._echoHost.createSpaceWithRootDocument(ctx, spaceKey)
      : undefined;
    const spaceId = createdSpace?.spaceId ?? (await createIdFromSpaceKey(spaceKey));
    if (!createdSpace) {
      this._legacyCreatedSpaces.add(spaceId);
    }

    const metadata: SpaceMetadata = {
      key: spaceKey,
      spaceId,
      genesisFeedKey: controlFeedKey,
      controlFeedKey,
      dataFeedKey,
      state: SpaceState.SPACE_ACTIVE,
      tags,
    };

    log('creating space...', { spaceId, spaceKey });

    // New document IDs for the space.
    const documentIdMapping: Record<DocumentId, DocumentId> = {};
    if (options.documents) {
      invariant(
        Object.keys(options.documents).every((documentId) => /^[a-zA-Z0-9]+$/.test(documentId)),
        'Invalid document IDs',
      );

      await Promise.all(
        Object.entries(options.documents).map(async ([documentId, data]) => {
          log('creating document...', { documentId });
          // TODO(dmaretskyi): Broken types -- the bytes get interpreted as CRDT data.
          using newDoc = await this._echoHost.createDoc(data as any as DatabaseDirectory, {
            preserveHistory: true,
          });

          // The archived documents might have the spaceKey from the space they were expored from, we need to update it to the new spaceKey.
          if (newDoc.doc().access !== undefined && newDoc.doc().access!.spaceKey !== spaceKey.toHex()) {
            newDoc.change((doc) => {
              doc.access!.spaceKey = spaceKey.toHex();
            });
          }

          documentIdMapping[documentId as DocumentId] = newDoc.documentId;
        }),
      );
    }

    log('opening space...', { spaceKey });

    let root: DatabaseRoot;
    if (createdSpace) {
      root = createdSpace.directory;
    } else if (options.rootUrl) {
      const newRootDocId = documentIdMapping[interpretAsDocumentId(options.rootUrl)] ?? failedInvariant();
      using rootDocLease = await this._echoHost.loadDoc<DatabaseDirectory>(ctx, newRootDocId);
      invariant(rootDocLease, 'Root document must be available after import.');
      DatabaseRoot.mapLinks(rootDocLease, documentIdMapping);

      root = await this._echoHost.updateSpaceRoot(ctx, spaceId, `automerge:${newRootDocId}` as AutomergeUrl);
    } else {
      root = await this._echoHost.createSpaceRoot(ctx, spaceKey);
    }
    await this._echoHost.flush(ctx);

    log('constructing space...', { spaceKey });

    const space = await this._constructSpace(ctx, metadata);
    await space.open(ctx);

    log('adding space...', { spaceKey });

    const credentials = await spaceGenesis(
      this._keyring,
      this.signingContext,
      space.inner,
      root.url,
      tags,
      options.membershipPolicy,
      createdSpace?.spaceRootUrl,
    );
    await this._metadataStore.addSpace(metadata);

    const memberCredential = credentials[1];
    invariant(getCredentialAssertion(memberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await this.signingContext.recordCredential(memberCredential);

    await space.initializeDataPipeline(ctx);

    log('space ready.', { spaceId, spaceKey });

    this.updated.emit();
    return space;
  }

  /**
   * Accepts an existing space by joining its swarm and initializing the data pipeline.
   * @param ctx - Caller context for cancellation and tracing.
   * @param opts - Space keys and optional timeframes for catch-up.
   */
  // TODO(burdon): Rename join space.
  @synchronized
  @trace.span({ showInBrowserTimeline: true, op: 'lifecycle' })
  async acceptSpace(ctx: Context, opts: AcceptSpaceOptions): Promise<DataSpace> {
    log('accept space', { opts });
    invariant(this._lifecycleState === LifecycleState.OPEN, 'Not open.');
    invariant(!this._spaces.has(opts.spaceKey), 'Space already exists.');
    invariant(!this.isSpaceDeleted(opts.spaceKey), 'Cannot accept a deleted space.');

    const tags = opts.tags ? Array.from(opts.tags) : [];
    const metadata: SpaceMetadata = {
      key: opts.spaceKey,
      spaceId: await createIdFromSpaceKey(opts.spaceKey),
      genesisFeedKey: opts.genesisFeedKey,
      controlTimeframe: opts.controlTimeframe,
      dataTimeframe: opts.dataTimeframe,
      tags,
    };

    const space = await this._constructSpace(ctx, metadata);
    await space.open(ctx);
    // Anchoring must adopt the root the inviter named rather than mint one, so remember it: a second
    // root over the same space would split its credential set, leaving members disagreeing about
    // which document carries the chain.
    if (opts.spaceRootUrl !== undefined && isValidAutomergeUrl(opts.spaceRootUrl)) {
      this._pendingSpaceRootUrls.set(space.id, opts.spaceRootUrl);
    }
    await this._metadataStore.addSpace(metadata);
    // Use DSM lifecycle ctx: the invitation accept flow disposes `ctx` as soon as
    // `acceptSpace` returns (guardedState.complete -> ctx.dispose). Detached data-pipeline
    // initialization must outlive the invitation flow, and its span must be parented to a
    // long-lived context.
    space.initializeDataPipelineAsync(this._ctx);

    this.updated.emit();
    return space;
  }

  /**
   * Mints a space root over a legacy space, transparently and idempotently, keeping its space id. Never
   * blocks opening the space: a space without an anchor still works, it just has not migrated yet.
   */
  /**
   * @returns Whether the space needs no further anchoring attempt — either because it is now anchored
   * or because it never will be. False means the attempt no-oped and the caller should retry, which a
   * space whose directory is not assigned yet depends on.
   */
  private async _anchorSpaceOnRootDocument(ctx: Context, space: DataSpace, force = false): Promise<boolean> {
    // Migrating a space is the opt-in behaviour, so without the flag a space keeps its control feed
    // and never grows a root. An explicit `migrateSpaceToRootDocument` call still forces it.
    if (!force && !this._automergeCredentials) {
      return true;
    }

    // A space created legacy stays unanchored for this session, or there would be no way to produce
    // the pre-migration state the migration path starts from. It anchors on the next load, which is
    // exactly the migration this project is for.
    if (!force && this._legacyCreatedSpaces.has(space.id)) {
      return true;
    }

    try {
      if (!this._echoHost.getSpaceRootRefs(space.id)) {
        // A root the inviter named is the space's only root; adopting it has to wait for it to
        // replicate rather than fall through to minting a second one over the same space.
        const named = this._pendingSpaceRootUrls.get(space.id);
        if (named !== undefined) {
          try {
            const refs = await this._echoHost.adoptSpaceRoot(ctx, space.id, named);
            this._pendingSpaceRootUrls.delete(space.id);
            log('adopted the space root named by the inviter', { spaceId: space.id, refs });
          } catch (err) {
            log('space root named by the inviter has not replicated yet', { spaceId: space.id, named, err });
            return false;
          }
        } else {
          const refs = await this._echoHost.migrateSpaceToRootDocument(ctx, space.id);
          if (!refs) {
            return false;
          }

          log('migrated space to root document', { spaceId: space.id, refs });
        }
      }

      // Re-checked after the adopt/migrate await: the anchor now runs on the manager's context, so a
      // space that started closing during it would otherwise still gain credentials and be reported.
      if (!this._isSpaceLive(space)) {
        return false;
      }

      // Unsettled when the mirror bailed on a closing space: latching would leave the credentials
      // half-written with nothing to retry it, since an anchored space never attempts again.
      if (!(await this._mirrorCredentialsToDocument(space))) {
        return false;
      }
      this._reportSpaceRootToEdge(space);
      return true;
    } catch (err) {
      log.warn('failed to anchor space on a root document', { spaceId: space.id, err });
      return false;
    }
  }

  /** Whether the anchor's background work may still act on this space. */
  private _isSpaceLive(space: DataSpace): boolean {
    return space.isOpen && !this._closingSpaces.has(space.id);
  }

  /**
   * Names the space root to edge, which cannot derive it from a space id that is the hash of the
   * space key, leaving the space on its control feed.
   */
  private _reportSpaceRootToEdge(space: DataSpace): void {
    const refs = this._echoHost.getSpaceRootRefs(space.id);
    if (!this._edgeHttpClient || !refs) {
      return;
    }

    // Retried in the background because edge rejects a root whose documents have not replicated to
    // it yet, and bound to the manager's own context because the invitation accept flow disposes
    // its ctx the moment `acceptSpace` returns, which would cancel every pending retry.
    let delay = SPACE_ROOT_REPORT_RETRY_INITIAL;
    const report = async (): Promise<void> => {
      // A retry outlives the attempt that scheduled it, so it has to re-check: a space closed or
      // removed in between must not be named to edge.
      if (!this._isSpaceLive(space)) {
        return;
      }
      try {
        await this._edgeHttpClient!.recordSpaceRoot(this._ctx, space.id, {
          rootDocumentUrl: refs.spaceRootDocUrl,
        });
        log('reported the space root to edge', { spaceId: space.id });
      } catch (err) {
        if (delay > SPACE_ROOT_REPORT_RETRY_MAX) {
          log.warn('gave up reporting the space root to edge', { spaceId: space.id, err });
          return;
        }

        log('space root not accepted by edge yet, retrying', { spaceId: space.id, delay, err });
        scheduleTask(this._ctx, report, delay);
        delay *= 2;
      }
    };

    scheduleTask(this._ctx, report);
  }

  /**
   * Mirrors the space's credentials into its credentials document. Subscribing to processed
   * credentials backfills the existing chain and dual-writes new ones through one path, since the
   * control pipeline replays the whole feed on open.
   */
  private async _mirrorCredentialsToDocument(space: DataSpace): Promise<boolean> {
    {
      // The manager's own context, not the caller's: the invitation flow disposes its context as
      // soon as `acceptSpace` returns, and a store bound to it would be released before its first
      // write — the same reason `initializeDataPipelineAsync` is parented here.
      const ctx = this._ctx;
      const store = await openCredentialsDocument(ctx, this._echoHost, space.id);
      if (!this._isSpaceLive(space)) {
        return false;
      }
      for (const credential of space.inner.spaceState.credentials) {
        store.append(credential);
      }

      ctx.onDispose(space.inner.credentialProcessed.on((credential) => store.append(credential)));

      // Read side: the document feeds the same state machine the feed does. Processing is idempotent
      // by credential id, so during the migration window both sources can run without conflict — a
      // space that has flipped simply stops gaining feed credentials.
      store.subscribe(ctx, (credential) => space.inner.processDocumentCredential(credential));
      return true;
    }
  }

  /**
   * Migrates a legacy space onto a space root document, keeping its id, and starts mirroring its
   * credentials into the document. Idempotent.
   */
  async migrateSpaceToRootDocument(ctx: Context, spaceKey: PublicKey): Promise<SpaceRootRefs> {
    const space = this._spaces.get(spaceKey) ?? failedInvariant();
    await this._anchorSpaceOnRootDocument(ctx, space, true);
    return this._echoHost.getSpaceRootRefs(space.id) ?? failedInvariant();
  }

  /**
   * Whether the space has been tombstoned (soft-deleted). Deleted spaces are never opened or replicated.
   */
  isSpaceDeleted(spaceKey: PublicKey): boolean {
    // Mirror the deletion predicate used in `_open`: the tombstone list or a persisted SPACE_DELETED state.
    return (
      this._metadataStore.deletedSpaces.some((key) => key.equals(spaceKey)) ||
      this._metadataStore.spaces.some(
        (spaceMetadata) => spaceMetadata.key.equals(spaceKey) && spaceMetadata.state === SpaceState.SPACE_DELETED,
      )
    );
  }

  /**
   * Tombstones (soft-deletes) a space initiated locally on this device.
   * Records a SpaceDeleted credential in the HALO so the deletion replicates to the user's other devices,
   * then unloads the space locally. Data is not removed until garbage collection (future work).
   */
  @synchronized
  async markSpaceDeleted(ctx: Context, spaceKey: PublicKey): Promise<void> {
    if (this.isSpaceDeleted(spaceKey)) {
      return;
    }

    // Replicates to the user's other devices via the HALO control feed.
    const credential = await this.signingContext.credentialSigner.createCredential({
      subject: spaceKey,
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceDeleted',
        spaceKey,
        'deletedAt': new Date(),
      },
    });
    await this.signingContext.recordCredential(credential);

    await this._tombstoneSpace(ctx, spaceKey);
  }

  /**
   * Tombstones a space in response to a SpaceDeleted credential replicated from another device.
   * Does not write a credential (one already exists in the HALO).
   */
  @synchronized
  async handleRemoteSpaceDeleted(ctx: Context, spaceKey: PublicKey): Promise<void> {
    if (this.isSpaceDeleted(spaceKey)) {
      return;
    }

    await this._tombstoneSpace(ctx, spaceKey);
  }

  /**
   * Persists the tombstone and unloads the space if it is currently loaded.
   * Must be called while holding the DataSpaceManager lock (see callers).
   */
  private async _tombstoneSpace(ctx: Context, spaceKey: PublicKey): Promise<void> {
    await this._metadataStore.addDeletedSpace(spaceKey);

    const space = this._spaces.get(spaceKey);
    if (space) {
      // Separate teardown (resource lifecycle) from the terminal state transition.
      if (space.isOpen) {
        await space.close(ctx);
      }
      await space.delete();
      this._spaces.delete(spaceKey);
    }

    this.updated.emit();
  }

  async admitMember(options: AdmitMemberOptions): Promise<Credential> {
    const space = this._spaceManager.spaces.get(options.spaceKey);
    invariant(space);

    if (space.spaceState.getMemberRole(options.identityKey) !== SpaceMember.Role.REMOVED) {
      throw new AlreadyJoinedError();
    }

    // Resolved here rather than at each call site: a caller that forgets it emits a credential the
    // admitted member cannot find the root from.
    const spaceRootUrl = options.spaceRootUrl ?? this._echoHost.getSpaceRootRefs(space.id)?.spaceRootDocUrl;

    // TODO(burdon): Check if already admitted.
    const credentials: FeedMessage.Payload[] = await createAdmissionCredentials({
      signer: this.signingContext.credentialSigner,
      identityKey: options.identityKey,
      spaceKey: space.key,
      genesisFeedKey: space.genesisFeedKey,
      role: options.role,
      membershipChainHeads: space.spaceState.membershipChainHeads,
      profile: options.profile,
      invitationCredentialId: options.delegationCredentialId,
      tags: space.spaceState.tags,
      spaceRootUrl,
    });

    // TODO(dmaretskyi): Refactor.
    invariant(credentials[0].credential);
    const spaceMemberCredential = credentials[0].credential.credential;
    invariant(getCredentialAssertion(spaceMemberCredential)['@type'] === 'dxos.halo.credentials.SpaceMember');
    await writeMessages(space.controlPipeline.writer, credentials);

    return spaceMemberCredential;
  }

  /**
   * Wait until the space data pipeline is fully initialized.
   * Used by invitation handler.
   * TODO(dmaretskyi): Consider removing.
   */
  async waitUntilSpaceReady(spaceKey: PublicKey): Promise<void> {
    await cancelWithContext(
      this._ctx,
      this.updated.waitForCondition(() => {
        const space = this._spaces.get(spaceKey);
        return !!space && space.state === SpaceState.SPACE_READY;
      }),
    );
  }

  public async requestSpaceAdmissionCredential(ctx: Context, spaceKey: PublicKey): Promise<Credential> {
    return this._spaceManager.requestSpaceAdmissionCredential(ctx, {
      spaceKey,
      identityKey: this.signingContext.identityKey,
      timeout: 15_000,
      swarmIdentity: {
        identityKey: this.signingContext.identityKey,
        peerKey: this.signingContext.deviceKey,
        credentialProvider: createAuthProvider(this.signingContext.credentialSigner),
        credentialAuthenticator: async () => true,
      },
    });
  }

  async setSpaceEdgeReplicationSetting(
    ctx: Context,
    spaceKey: PublicKey,
    setting: EdgeReplicationSetting,
  ): Promise<void> {
    const space = this._spaces.get(spaceKey);
    invariant(space, 'Space not found.');

    await this._metadataStore.setSpaceEdgeReplicationSetting(spaceKey, setting);

    if (space.isOpen) {
      switch (setting) {
        case EdgeReplicationSetting.DISABLED:
          await this._echoEdgeReplicator?.disconnectFromSpace(space.id);
          break;
        case EdgeReplicationSetting.ENABLED:
          await this._echoEdgeReplicator?.connectToSpace(ctx, space.id);
          break;
      }
    }

    space.stateUpdate.emit();
  }

  private async _constructSpace(ctx: Context, metadata: SpaceMetadata): Promise<DataSpace> {
    log('construct space', { metadata });
    const gossip = new Gossip({
      localPeerId: this.signingContext.deviceKey,
    });
    const presence = new Presence({
      announceInterval: this._runtimeProps?.spaceMemberPresenceAnnounceInterval ?? PRESENCE_ANNOUNCE_INTERVAL,
      offlineTimeout: this._runtimeProps?.spaceMemberPresenceOfflineTimeout ?? PRESENCE_OFFLINE_TIMEOUT,
      identityKey: this.signingContext.identityKey,
      gossip,
    });

    const controlFeed =
      metadata.controlFeedKey && (await this._feedStore.openFeed(metadata.controlFeedKey, { writable: true }));
    const dataFeed =
      metadata.dataFeedKey &&
      (await this._feedStore.openFeed(metadata.dataFeedKey, {
        writable: true,
        sparse: true,
      }));

    const space: Space = await this._spaceManager.constructSpace({
      metadata,
      swarmIdentity: {
        identityKey: this.signingContext.identityKey,
        peerKey: this.signingContext.deviceKey,
        credentialProvider: createAuthProvider(this.signingContext.credentialSigner),
        credentialAuthenticator: deferFunction(() => dataSpace.authVerifier.verifier),
      },
      onAuthorizedConnection: (session) =>
        queueMicrotask(async () => {
          try {
            if (!session.isOpen) {
              return;
            }
            session.addExtension('dxos.mesh.teleport.admission-discovery', new CredentialServerExtension(space));
            session.addExtension(
              'dxos.mesh.teleport.gossip',
              gossip.createExtension({ remotePeerId: session.remotePeerId }),
            );
            session.addExtension('dxos.mesh.teleport.notarization', dataSpace.notarizationPlugin.createExtension());
            await this._connectEchoMeshReplicator(space, session);
          } catch (err: any) {
            log.warn('error on authorized connection', { err });
            await session.close(err);
          }
        }),
      onAuthFailure: () => {
        log.warn('auth failure');
      },
      onMemberRolesChanged: async (members: MemberInfo[]) => {
        if (dataSpace?.state === SpaceState.SPACE_READY) {
          this._handleMemberRoleChanges(presence, space.protocol, members);
        }
      },
      memberKey: this.signingContext.identityKey,
      onDelegatedInvitationStatusChange: (invitation, isActive) => {
        return this._handleInvitationStatusChange(dataSpace, invitation, isActive);
      },
    });
    controlFeed && (await space.setControlFeed(controlFeed));
    dataFeed && (await space.setDataFeed(dataFeed));

    const dataSpace = new DataSpace({
      inner: space,
      initialState: metadata.state === SpaceState.SPACE_INACTIVE ? SpaceState.SPACE_INACTIVE : SpaceState.SPACE_CLOSED,
      metadataStore: this._metadataStore,
      gossip,
      presence,
      keyring: this._keyring,
      feedStore: this._feedStore,
      echoHost: this._echoHost,
      signingContext: this.signingContext,
      callbacks: {
        beforeReady: async () => {
          log('before space ready', { space: space.key });
        },
        afterReady: async () => {
          log('after space ready', { space: space.key, open: this._lifecycleState === LifecycleState.OPEN });
          if (this._lifecycleState === LifecycleState.OPEN) {
            await this._createDelegatedInvitations(dataSpace, [...space.spaceState.invitations.entries()]);
            this._handleMemberRoleChanges(presence, space.protocol, [...space.spaceState.members.values()]);
            this.updated.emit();
          }
        },
        beforeClose: async () => {
          log('before space close', { space: space.key });
        },
      },
      tags: metadata.tags,
      edgeConnection: this._edgeConnection,
      edgeHttpClient: this._edgeHttpClient,
      edgeFeatures: this._edgeFeatures,
      activeEdgeNotarizationPollingInterval: this._runtimeProps?.activeEdgeNotarizationPollingInterval,
    });
    dataSpace.postOpen.append(async () => {
      const setting = dataSpace.getEdgeReplicationSetting();
      if (!setting || setting === EdgeReplicationSetting.ENABLED) {
        // Use lifecycle ctx: the caller ctx from _constructSpace may be disposed by the time postOpen fires.
        await this._echoEdgeReplicator?.connectToSpace(this._ctx, dataSpace.id);
      } else if (this._echoEdgeReplicator) {
        log('not connecting edge replicator because of EdgeReplicationSetting', { spaceId: dataSpace.id });
      }
    });
    dataSpace.preClose.append(async () => {
      this._closingSpaces.add(dataSpace.id);
      const setting = dataSpace.getEdgeReplicationSetting();
      if (!setting || setting === EdgeReplicationSetting.ENABLED) {
        await this._echoEdgeReplicator?.disconnectFromSpace(dataSpace.id);
      }
    });

    presence.newPeer.on((peerState) => {
      if (dataSpace.state === SpaceState.SPACE_READY) {
        this._handleNewPeerConnected(space, peerState);
      }
    });

    if (metadata.controlTimeframe) {
      dataSpace.inner.controlPipeline.state.setTargetTimeframe(metadata.controlTimeframe);
    }

    // Cleared on the way back up: a closed space can be activated again, and a stale mark would
    // leave it unanchorable for the session.
    dataSpace.stateUpdate.on(this._ctx, () => {
      if (dataSpace.isOpen) {
        this._closingSpaces.delete(dataSpace.id);
      }
    });

    // Anchoring materializes credential state, so it waits for the space to be open: a closed space
    // must stay unmaterialized or lazy loading is defeated. Every path that opens a space — load and
    // activate, create, accept — arrives here.
    // Latch only once the anchor has actually settled: migration no-ops while the space's directory is
    // unassigned, and latching on the attempt would strand the space unanchored for the whole session.
    let anchored = false;
    let anchoring = false;
    let retryDelay = ANCHOR_RETRY_INITIAL;
    const attemptAnchor = () => {
      if (anchored || anchoring || !dataSpace.isOpen) {
        return;
      }

      anchoring = true;
      // The manager's context, not the caller's: an accepted space arrives with the invitation's
      // context, which `acceptSpace` disposes on return, and the anchor's own awaits would be
      // cancelled under it.
      void this._anchorSpaceOnRootDocument(this._ctx, dataSpace)
        .then((settled) => {
          anchored = settled;
          if (settled) {
            return;
          }

          // What an unsettled attempt waits on — an unassigned directory, or a root named by an
          // inviter that has not replicated yet — arrives without emitting a space state update, so
          // nothing else would ever retry.
          if (retryDelay <= ANCHOR_RETRY_MAX) {
            scheduleTask(this._ctx, attemptAnchor, retryDelay);
            retryDelay *= 2;
          }
        })
        .finally(() => {
          anchoring = false;
        });
    };

    // Subscribed for the space's lifetime rather than the caller's: a root named by an inviter can
    // replicate long after the invitation context is gone, and its state update is what retries.
    const unsubscribeFromStateUpdate = dataSpace.stateUpdate.on(this._ctx, attemptAnchor);
    dataSpace.preClose.append(async () => unsubscribeFromStateUpdate());

    this._spaces.set(metadata.key, dataSpace);
    return dataSpace;
  }

  private async _connectEchoMeshReplicator(space: Space, session: Teleport): Promise<void> {
    const replicator = this._meshReplicator;
    if (!replicator) {
      log.warn('p2p automerge replication disabled', { space: space.key });
      return;
    }
    await replicator.authorizeDevice(space.id, session.remotePeerId);
    // session ended during device authorization
    if (session.isOpen) {
      session.addExtension('dxos.mesh.teleport.automerge', replicator.createExtension());
    }
  }

  private _handleMemberRoleChanges(presence: Presence, spaceProtocol: SpaceProtocol, memberInfo: MemberInfo[]): void {
    let closedSessions = 0;
    for (const member of memberInfo) {
      if (member.key.equals(presence.getLocalState().identityKey)) {
        continue;
      }
      const peers = presence.getPeersByIdentityKey(member.key);
      const sessions = peers.map((p) => p.peerId && spaceProtocol.sessions.get(p.peerId));
      const sessionsToClose = sessions.filter((s): s is SpaceProtocolSession => {
        return (s && (member.role === SpaceMember.Role.REMOVED) !== (s.authStatus === AuthStatus.FAILURE)) ?? false;
      });
      sessionsToClose.forEach((session) => {
        void session.close().catch(log.error);
      });
      closedSessions += sessionsToClose.length;
    }
    log('processed member role changes', {
      roleChangeCount: memberInfo.length,
      peersOnline: presence.getPeersOnline().length,
      closedSessions,
    });
    // Handle the case when there was a removed peer online, we can now establish a connection with them
    spaceProtocol.updateTopology();
  }

  private _handleNewPeerConnected(space: Space, peerState: PeerState): void {
    const role = space.spaceState.getMemberRole(peerState.identityKey);
    if (role === SpaceMember.Role.REMOVED) {
      const session = peerState.peerId && space.protocol.sessions.get(peerState.peerId);
      if (session != null) {
        log('closing a session with a removed peer', { peerId: peerState.peerId });
        void session.close().catch(log.error);
      }
    }
  }

  private async _handleInvitationStatusChange(
    dataSpace: DataSpace | undefined,
    delegatedInvitation: DelegateInvitationCredential,
    isActive: boolean,
  ): Promise<void> {
    if (dataSpace?.state !== SpaceState.SPACE_READY) {
      return;
    }
    if (isActive) {
      await this._createDelegatedInvitations(dataSpace, [
        [delegatedInvitation.credentialId, delegatedInvitation.invitation],
      ]);
    } else {
      await this._invitationsManager.cancelInvitation(delegatedInvitation.invitation);
    }
  }

  private async _createDelegatedInvitations(
    space: DataSpace,
    invitations: Array<[PublicKey, DelegateSpaceInvitation]>,
  ): Promise<void> {
    const tasks = invitations.map(([credentialId, invitation]) => {
      return this._invitationsManager.createInvitation(this._ctx, {
        type: Invitation.Type.DELEGATED,
        kind: Invitation.Kind.SPACE,
        spaceKey: space.key,
        authMethod: invitation.authMethod,
        invitationId: invitation.invitationId,
        swarmKey: invitation.swarmKey,
        guestKeypair: invitation.guestKey ? { publicKey: invitation.guestKey } : undefined,
        lifetime: invitation.expiresOn ? remainingLifetimeSeconds(invitation.expiresOn) : undefined,
        multiUse: invitation.multiUse,
        delegationCredentialId: credentialId,
        persistent: false,
      });
    });
    await Promise.all(tasks);
  }
}

/**
 * Seconds left until `expiresOn`, as `Invitation.lifetime` requires: a whole number, because the
 * field is a protobuf `int32` and a fractional value fails to encode — which silently killed the
 * `queryInvitations` stream and hung client initialization. Floors to at least 1 since 0 means
 * "never expires", so an already-expired invitation must not become immortal.
 */
export const remainingLifetimeSeconds = (expiresOn: Date): number =>
  Math.max(1, Math.floor((expiresOn.getTime() - Date.now()) / 1000));

export class DataSpaceManagerService extends EffectContext.Service<DataSpaceManagerService, DataSpaceManager>()(
  '@dxos/client-services/DataSpaceManager',
) {}

export type DataSpaceManagerLayerOptions = Pick<DataSpaceManagerProps, 'runtimeProps' | 'edgeFeatures'>;

/**
 * Effect Layer constructing a dormant {@link DataSpaceManager}.
 */
export const DataSpaceManagerLayer = (
  options: DataSpaceManagerLayerOptions = {},
): Layer.Layer<
  DataSpaceManagerService,
  never,
  | SpaceManagerService
  | IMetadataStoreService
  | KeyringApiService
  | SigningContextProviderService
  | FeedStoreService
  | EchoHostService
  | InvitationsManagerService
> =>
  Layer.effect(
    DataSpaceManagerService,
    Effect.gen(function* () {
      const spaceManager = yield* SpaceManagerService;
      const metadataStore = yield* IMetadataStoreService;
      const keyring = yield* KeyringApiService;
      const signingContextProvider = yield* SigningContextProviderService;
      const feedStore = yield* FeedStoreService;
      const echoHost = yield* EchoHostService;
      const invitationsManager = yield* InvitationsManagerService;
      const edgeConnection = yield* Effect.serviceOption(EdgeConnectionService);
      const edgeHttpClient = yield* Effect.serviceOption(EdgeHttpClientService);
      const meshReplicator = yield* Effect.serviceOption(MeshEchoReplicatorService);
      const echoEdgeReplicator = yield* Effect.serviceOption(EdgeAutomergeReplicatorService);

      return new DataSpaceManager({
        spaceManager,
        metadataStore,
        keyring,
        signingContextProvider,
        feedStore,
        echoHost,
        invitationsManager,
        edgeConnection: Option.getOrUndefined(edgeConnection),
        edgeHttpClient: Option.getOrUndefined(edgeHttpClient),
        meshReplicator: Option.getOrUndefined(meshReplicator),
        echoEdgeReplicator: Option.getOrUndefined(echoEdgeReplicator),
        ...options,
      });
    }),
  );
