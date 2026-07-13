//
// Copyright 2022 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
import type * as SqlError from '@effect/sql/SqlError';
import * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';

import { Mutex, Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { failUndefined, warnAfterTimeout } from '@dxos/debug';
import {
  type AutomergeReplicator,
  type EchoHost,
  EchoHostService,
  type EdgeAutomergeReplicator,
  EdgeAutomergeReplicatorService,
  MeshEchoReplicatorService,
  runSqliteHealthCheck,
} from '@dxos/echo-host';
import {
  type EdgeConnection,
  EdgeConnectionService,
  type EdgeHttpClient,
  EdgeHttpClientService,
  type EdgeIdentity,
  createChainEdgeIdentity,
  createEphemeralEdgeIdentity,
} from '@dxos/edge-client';
import { RuntimeProvider } from '@dxos/effect';
import { type FeedStore, FeedStoreService } from '@dxos/feed-store';
import { invariant } from '@dxos/invariant';
import { type KeyringApi, KeyringApiService } from '@dxos/keyring';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { type SignalManager, SignalManagerService } from '@dxos/messaging';
import { type SwarmNetworkManager, SwarmNetworkManagerService } from '@dxos/network-manager';
import { InvalidStorageVersionError, STORAGE_VERSION } from '@dxos/protocols';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import type { FeedMessage } from '@dxos/protocols/proto/dxos/echo/feed';
import { type Credential, type ProfileDocument } from '@dxos/protocols/proto/dxos/halo/credentials';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { type BlobStoreApi, BlobStoreApiService } from '@dxos/teleport-extension-object-sync';

import { EdgeAgentManager, EdgeAgentManagerService } from '../agents';
import {
  type CreateIdentityOptions,
  type Identity,
  type IdentityManager,
  IdentityManagerService,
  type JoinIdentityProps,
} from '../identity';
import { EdgeIdentityRecoveryManager, EdgeIdentityRecoveryManagerService } from '../identity/identity-recovery-manager';
import {
  DeviceInvitationProtocol,
  type InvitationProtocol,
  type InvitationsHandler,
  InvitationsHandlerService,
  type InvitationsManager,
  InvitationsManagerService,
  SpaceInvitationProtocol,
} from '../invitations';
import { type IMetadataStore, IMetadataStoreService } from '../metadata';
import { type SpaceManager, SpaceManagerService } from '../space';
import {
  DataSpaceManager,
  DataSpaceManagerService,
  type SigningContextProvider,
  SigningContextProviderService,
} from '../spaces';
import {
  type CrossDeviceSpaceSynchronizer,
  CrossDeviceSpaceSynchronizerService,
} from './cross-device-space-synchronizer';
import { type FeedSyncer, FeedSyncerService } from './feed-syncer';
import { type ServiceContextComponents, StorageMigrationService } from './service-context';

// SqlTransaction.SqlTransaction is the Tag class exported from the SqlTransaction namespace.
type SqlTransactionTag = SqlTransaction.SqlTransaction;

/**
 * Runtime resolving the composed service components. The concrete runtime built by the host (or the
 * test builder) provides a superset; {@link ManagedRuntime}'s `ROut` is contravariant, so it is
 * assignable here.
 */
export type ServiceStackRuntime = ManagedRuntime.ManagedRuntime<
  | ServiceContextComponents
  | SwarmNetworkManagerService
  | SignalManagerService
  | SqlClient.SqlClient
  | SqlTransactionTag,
  never
>;

/**
 * The component instances resolved once from the stack (the composition root). Lifecycle functions
 * receive this bundle rather than re-resolving each tag from the runtime on every call. Optional
 * components (edge clients, replicators, feed syncer) are absent when their config path is disabled.
 */
type ServiceComponents = {
  readonly networkManager: SwarmNetworkManager;
  readonly signalManager: SignalManager;
  readonly metadataStore: IMetadataStore;
  readonly blobStore: BlobStoreApi;
  readonly keyring: KeyringApi;
  readonly feedStore: FeedStore<FeedMessage>;
  readonly spaceManager: SpaceManager;
  readonly identityManager: IdentityManager;
  readonly recoveryManager: EdgeIdentityRecoveryManager;
  readonly invitations: InvitationsHandler;
  readonly invitationsManager: InvitationsManager;
  readonly echoHost: EchoHost;
  readonly dataSpaceManager: DataSpaceManager;
  readonly edgeAgentManager: EdgeAgentManager;
  readonly deviceSpaceSync: CrossDeviceSpaceSynchronizer;
  readonly signingContextProvider: SigningContextProvider;

  readonly edgeConnection?: EdgeConnection;
  readonly edgeHttpClient?: EdgeHttpClient;
  readonly meshReplicator?: AutomergeReplicator;
  readonly echoEdgeReplicator?: EdgeAutomergeReplicator;
  readonly feedSyncer?: FeedSyncer;

  // Stage-2 storage work: the combined migration effect and the runtime that can run it.
  readonly storageMigrate: Effect.Effect<void, SqlError.SqlError, SqlClient.SqlClient | SqlTransactionTag>;
  readonly runtimeProvider: RuntimeProvider.RuntimeProvider<SqlClient.SqlClient | SqlTransactionTag>;
};

/**
 * Orchestration state that is not itself a service: the readiness gate, the edge-identity update
 * mutex, and the invitation handler factories.
 */
export type ServiceLifecycleState = {
  readonly initialized: Trigger;
  readonly edgeIdentityUpdateMutex: Mutex;
  readonly handlerFactories: Map<Invitation.Kind, (invitation: Partial<Invitation>) => InvitationProtocol>;
  /** Lifecycle context, replaced with the caller's context on open. */
  ctx: Context;
  opened: boolean;
};

/**
 * The lifecycle surface the client RPC service handlers depend on: identity creation, profile
 * broadcast, and the readiness gates for identity-bound services.
 */
export interface ClientLifecycle {
  createIdentity(params?: CreateIdentityOptions, ctx?: Context): Promise<Identity>;
  whenInitialized(): Promise<void>;
  broadcastProfileUpdate(profile: ProfileDocument | undefined): Promise<void>;
  whenDataSpaceManagerReady(): Promise<DataSpaceManager>;
  whenEdgeAgentManagerReady(): Promise<EdgeAgentManager>;
}

/**
 * Tag the RPC service layer resolves for lifecycle orchestration. Provided by the host from the
 * {@link ServiceContext} handle.
 */
export class ClientLifecycleService extends EffectContext.Tag('@dxos/client-services/ClientLifecycle')<
  ClientLifecycleService,
  ClientLifecycle
>() {}

/**
 * Handle over the composed component stack, extending {@link ClientLifecycle} with direct access to
 * the resolved components. Retained for the legacy devtools / diagnostics / test consumers; the
 * production RPC path depends only on {@link ClientLifecycle}.
 */
export interface ServiceContext extends ClientLifecycle {
  readonly initialized: Trigger;

  readonly networkManager: SwarmNetworkManager;
  readonly signalManager: SignalManager;
  readonly metadataStore: IMetadataStore;
  readonly blobStore: BlobStoreApi;
  readonly keyring: KeyringApi;
  readonly feedStore: FeedStore<FeedMessage>;
  readonly spaceManager: SpaceManager;
  readonly identityManager: IdentityManager;
  readonly recoveryManager: EdgeIdentityRecoveryManager;
  readonly invitations: InvitationsHandler;
  readonly invitationsManager: InvitationsManager;
  readonly echoHost: EchoHost;

  // Always constructed by the stack (dormant until `initialized`), so typed optional only to match
  // the historical getter contract used by callers.
  readonly dataSpaceManager?: DataSpaceManager;
  readonly edgeAgentManager?: EdgeAgentManager;
  readonly edgeConnection?: EdgeConnection;

  open(ctx?: Context): Promise<void>;
  close(ctx?: Context): Promise<void>;
  getInvitationHandler(invitation: Partial<Invitation> & Pick<Invitation, 'kind'>): InvitationProtocol;
}

/**
 * Assembles a {@link ServiceContext} handle from a runtime that provides the composed components:
 * resolves every component once, wires the callbacks that point "up the stack" (recovery, invitation
 * handlers, feed sync), and binds the lifecycle operations over the resolved bundle.
 */
export const makeServiceContext = async (runtime: ServiceStackRuntime): Promise<ServiceContext> => {
  const state: ServiceLifecycleState = {
    initialized: new Trigger(),
    edgeIdentityUpdateMutex: new Mutex(),
    handlerFactories: new Map(),
    ctx: Context.default(),
    opened: false,
  };

  const components = await resolveComponents(runtime);
  wireServiceContext(components, state);

  return {
    initialized: state.initialized,
    networkManager: components.networkManager,
    signalManager: components.signalManager,
    metadataStore: components.metadataStore,
    blobStore: components.blobStore,
    keyring: components.keyring,
    feedStore: components.feedStore,
    spaceManager: components.spaceManager,
    identityManager: components.identityManager,
    recoveryManager: components.recoveryManager,
    invitations: components.invitations,
    invitationsManager: components.invitationsManager,
    echoHost: components.echoHost,
    dataSpaceManager: components.dataSpaceManager,
    edgeAgentManager: components.edgeAgentManager,
    edgeConnection: components.edgeConnection,
    open: (ctx = Context.default()) => openServiceContext(components, state, ctx),
    close: (ctx) => closeServiceContext(components, state, ctx),
    getInvitationHandler: (invitation) => getInvitationHandler(state, components.identityManager, invitation),
    createIdentity: (params = {}, ctx) => createIdentity(components, state, params, ctx),
    whenInitialized: () => state.initialized.wait(),
    broadcastProfileUpdate: (profile) => broadcastProfileUpdate(components, profile),
    whenDataSpaceManagerReady: () => whenDataSpaceManagerReady(components, state),
    whenEdgeAgentManagerReady: () => whenEdgeAgentManagerReady(components, state),
  };
};

/**
 * Resolves every stack component once. Required components are gathered in one pass; optional ones
 * (absent when their config path is disabled) are read via `serviceOption`.
 */
const resolveComponents = async (runtime: ServiceStackRuntime): Promise<ServiceComponents> => {
  const required = await runtime.runPromise(
    Effect.all({
      networkManager: SwarmNetworkManagerService,
      signalManager: SignalManagerService,
      metadataStore: IMetadataStoreService,
      blobStore: BlobStoreApiService,
      keyring: KeyringApiService,
      feedStore: FeedStoreService,
      spaceManager: SpaceManagerService,
      identityManager: IdentityManagerService,
      recoveryManager: EdgeIdentityRecoveryManagerService,
      invitations: InvitationsHandlerService,
      invitationsManager: InvitationsManagerService,
      echoHost: EchoHostService,
      dataSpaceManager: DataSpaceManagerService,
      edgeAgentManager: EdgeAgentManagerService,
      deviceSpaceSync: CrossDeviceSpaceSynchronizerService,
      signingContextProvider: SigningContextProviderService,
      storageMigrate: StorageMigrationService,
      runtimeProvider: RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>(),
    }),
  );
  const optional = await runtime.runPromise(
    Effect.all({
      edgeConnection: Effect.serviceOption(EdgeConnectionService),
      edgeHttpClient: Effect.serviceOption(EdgeHttpClientService),
      meshReplicator: Effect.serviceOption(MeshEchoReplicatorService),
      echoEdgeReplicator: Effect.serviceOption(EdgeAutomergeReplicatorService),
      feedSyncer: Effect.serviceOption(FeedSyncerService),
    }),
  );

  return {
    ...required,
    edgeConnection: Option.getOrUndefined(optional.edgeConnection),
    edgeHttpClient: Option.getOrUndefined(optional.edgeHttpClient),
    meshReplicator: Option.getOrUndefined(optional.meshReplicator),
    echoEdgeReplicator: Option.getOrUndefined(optional.echoEdgeReplicator),
    feedSyncer: Option.getOrUndefined(optional.feedSyncer),
  };
};

/**
 * Wires the components that point "up the stack": the device invitation protocol factory, recovered
 * identity acceptance, the invitation handler factory, and the echo-host feed sync handlers.
 */
const wireServiceContext = (components: ServiceComponents, state: ServiceLifecycleState): void => {
  const { keyring, identityManager, recoveryManager, invitationsManager, echoHost, feedSyncer } = components;

  state.handlerFactories.set(
    Invitation.Kind.DEVICE,
    () =>
      new DeviceInvitationProtocol(
        keyring,
        () => identityManager.identity ?? failUndefined(),
        (params) => acceptIdentity(components, state, params),
      ),
  );

  recoveryManager.setAcceptRecoveredIdentity((params) => acceptIdentity(components, state, params));
  invitationsManager.setInvitationHandlerFactory((invitation) =>
    getInvitationHandler(state, identityManager, invitation),
  );
  echoHost.setFeedSyncHandlers({
    syncFeed: async (ctx, request) =>
      feedSyncer?.syncBlocking(ctx, {
        // Proto carries spaceId as an unbranded string.
        spaceId: request.spaceId as SpaceId,
        subspaceTag: request.subspaceTag,
        shouldPush: request.shouldPush,
        shouldPull: request.shouldPull,
      }),
    getSyncState: async (ctx, request) => {
      // In non-edge / partially-initialised modes the feed syncer is absent. Return an empty state
      // instead of throwing so callers (e.g. devtools sync panel) keep working.
      if (!feedSyncer) {
        return { namespaces: [] };
      }
      return feedSyncer.getSyncState(ctx, request);
    },
  });
};

/**
 * Stage 1-2: run storage migrations, verify the storage version, open the identity/network/storage
 * components, wire replicators, and open identity-bound services once an identity is available.
 */
const openServiceContext = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
  ctx: Context,
): Promise<void> => {
  if (state.opened) {
    return;
  }
  state.ctx = ctx;

  const {
    identityManager,
    echoHost,
    metadataStore,
    spaceManager,
    signalManager,
    networkManager,
    invitationsManager,
    edgeConnection,
    meshReplicator,
    echoEdgeReplicator,
    feedSyncer,
    storageMigrate,
    runtimeProvider,
  } = components;

  log('running storage migrations...');
  await RuntimeProvider.runPromise(runtimeProvider)(storageMigrate);

  await checkStorageVersion(components);

  log('running sqlite health check...');
  await runSqliteHealthCheck(runtimeProvider);
  log('sqlite health check passed');

  log('opening identityManager...');
  await identityManager.open(ctx);
  log('identityManager opened', { hasIdentity: !!identityManager.identity });

  log('setting network identity...');
  await setNetworkIdentity(components, state, { identity: identityManager.identity });

  log('opening edge connection...');
  await edgeConnection?.open(ctx);

  log('opening signal manager...');
  await signalManager.open(ctx);

  log('opening network manager...');
  await networkManager.open();

  // EchoHost open/close is owned by its layer scope (see `echoHostLayer`); the host is already open
  // here, so only the identity/network-bound replicator wiring remains below.
  if (meshReplicator) {
    log('adding mesh replicator...');
    await echoHost.addReplicator(ctx, meshReplicator);
  }
  if (echoEdgeReplicator) {
    log('adding edge replicator...');
    await echoHost.addReplicator(ctx, echoEdgeReplicator);
  }

  log('loading metadata store...');
  await metadataStore.load();

  log('opening space manager...');
  await spaceManager.open();

  if (identityManager.identity) {
    log('joining network...');
    await identityManager.identity.joinNetwork(ctx);

    log('initializing spaces...');
    await initialize(components, state, ctx);
  } else {
    log('no identity, skipping network join and space initialization');
  }

  log('opening feed syncer...');
  await feedSyncer?.open(ctx);

  log('loading persistent invitations...');
  const loadedInvitations = await invitationsManager.loadPersistentInvitations(ctx);
  log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

  state.opened = true;
  log('opened');
};

const closeServiceContext = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
  ctx: Context = Context.default(),
): Promise<void> => {
  if (!state.opened) {
    return;
  }
  log('closing...');

  await components.feedSyncer?.close();
  await components.deviceSpaceSync.close?.();
  await components.dataSpaceManager.close(ctx);
  await components.edgeAgentManager.close();
  await components.identityManager.close(ctx);
  await components.spaceManager.close();
  // EchoHost close is owned by its layer scope and runs when the runtime is disposed.

  await components.networkManager.close(ctx);
  await components.signalManager.close();
  await components.edgeConnection?.close();
  await components.feedStore.close();
  await components.metadataStore.close();

  state.opened = false;
  log('closed');
};

const createIdentity = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
  params: CreateIdentityOptions = {},
  ctx: Context = state.ctx,
): Promise<Identity> => {
  const identity = await components.identityManager.createIdentity(params, ctx);
  await setNetworkIdentity(components, state, { identity });
  await identity.joinNetwork(ctx);
  await initialize(components, state, ctx);
  return identity;
};

const acceptIdentity = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
  params: JoinIdentityProps,
): Promise<Identity> => {
  const { identity, identityRecord } = await components.identityManager.prepareIdentity(params, state.ctx);
  invariant(params.authorizedDeviceCredential, 'authorizedDeviceCredential is required to accept an identity.');
  await setNetworkIdentity(components, state, { deviceCredential: params.authorizedDeviceCredential, identity });
  await identity.joinNetwork(state.ctx);
  await components.identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
  await initialize(components, state, state.ctx);
  return identity;
};

const checkStorageVersion = async (components: ServiceComponents): Promise<void> => {
  const { metadataStore } = components;
  await metadataStore.load();
  if (metadataStore.version !== STORAGE_VERSION) {
    throw new InvalidStorageVersionError(STORAGE_VERSION, metadataStore.version);
    // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
  }
};

/**
 * Stage 3: opens the identity-bound services once an identity is available.
 */
const initialize = async (components: ServiceComponents, state: ServiceLifecycleState, ctx: Context): Promise<void> => {
  log('_initialize: start');
  const { identityManager, dataSpaceManager, edgeAgentManager, signingContextProvider, keyring, deviceSpaceSync } =
    components;
  const identity = identityManager.identity ?? failUndefined();

  await dataSpaceManager.open(ctx);
  log('_initialize: DataSpaceManager opened');

  await edgeAgentManager.open(ctx);
  log('_initialize: EdgeAgentManager opened');

  state.handlerFactories.set(
    Invitation.Kind.SPACE,
    (invitation) =>
      new SpaceInvitationProtocol(dataSpaceManager, signingContextProvider(), keyring, invitation.spaceKey),
  );
  state.initialized.wake();

  deviceSpaceSync.setIdentity(identity);
  await deviceSpaceSync.open?.(ctx);
};

const setNetworkIdentity = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
  params?: { deviceCredential?: Credential; identity?: Identity },
): Promise<void> => {
  log('_setNetworkIdentity: acquiring mutex...');
  using _guard = await state.edgeIdentityUpdateMutex.acquire();
  log('_setNetworkIdentity: mutex acquired');

  const { networkManager, edgeConnection, edgeHttpClient } = components;

  let edgeIdentity: EdgeIdentity;
  const identity = params?.identity;
  if (identity) {
    if (params?.deviceCredential) {
      edgeIdentity = await createChainEdgeIdentity(
        identity.signer,
        identity.identityKey,
        identity.deviceKey,
        { credential: params.deviceCredential },
        [], // TODO(dmaretskyi): Service access credentials.
      );
    } else {
      // TODO: throw here or from identity if device chain can't be loaded, to avoid indefinite hangup
      await warnAfterTimeout(10_000, 'Waiting for identity to be ready for edge connection', async () => {
        await identity.ready();
      });

      invariant(identity.deviceCredentialChain);

      edgeIdentity = await createChainEdgeIdentity(
        identity.signer,
        identity.identityKey,
        identity.deviceKey,
        identity.deviceCredentialChain,
        [], // TODO(dmaretskyi): Service access credentials.
      );
    }
  } else {
    edgeIdentity = await createEphemeralEdgeIdentity();
  }

  edgeConnection?.setIdentity(edgeIdentity);
  edgeHttpClient?.setIdentity(edgeIdentity);
  networkManager.setPeerInfo({
    identityDid: edgeIdentity.identityDid,
    peerKey: edgeIdentity.peerKey,
  });
  log('_setNetworkIdentity: done');
};

const getInvitationHandler = (
  state: ServiceLifecycleState,
  identityManager: IdentityManager,
  invitation: Partial<Invitation> & Pick<Invitation, 'kind'>,
): InvitationProtocol => {
  if (identityManager.identity == null && invitation.kind === Invitation.Kind.SPACE) {
    throw new Error('Identity must be created before joining a space.');
  }
  const factory = state.handlerFactories.get(invitation.kind);
  invariant(factory, `Unknown invitation kind: ${invitation.kind}`);
  return factory(invitation);
};

const broadcastProfileUpdate = async (
  components: ServiceComponents,
  profile: ProfileDocument | undefined,
): Promise<void> => {
  if (!profile) {
    return;
  }

  for (const space of components.dataSpaceManager.spaces.values()) {
    await space.updateOwnProfile(profile);
  }
};

/**
 * Resolves the {@link DataSpaceManager} once identity-bound services have opened (`initialized`).
 */
const whenDataSpaceManagerReady = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
): Promise<DataSpaceManager> => {
  await state.initialized.wait();
  return components.dataSpaceManager;
};

/**
 * Resolves the {@link EdgeAgentManager} once identity-bound services have opened (`initialized`).
 */
const whenEdgeAgentManagerReady = async (
  components: ServiceComponents,
  state: ServiceLifecycleState,
): Promise<EdgeAgentManager> => {
  await state.initialized.wait();
  return components.edgeAgentManager;
};
