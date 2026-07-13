//
// Copyright 2022 DXOS.org
//

import * as SqlClient from '@effect/sql/SqlClient';
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
  type IMetadataStore,
  IMetadataStoreService,
  MeshEchoReplicatorService,
  type SpaceManager,
  SpaceManagerService,
  runSqliteHealthCheck,
} from '@dxos/echo-host';
import {
  type EdgeConnection,
  EdgeConnectionService,
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
import { DataSpaceManager, DataSpaceManagerService, SigningContextProviderService } from '../spaces';
import { CrossDeviceSpaceSynchronizerService } from './cross-device-space-synchronizer';
import { FeedSyncerService } from './feed-syncer';
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
 * Orchestration state that is not itself a service: the readiness gate, the edge-identity update
 * mutex, and the invitation handler factories. Held per stack instance; services are resolved from
 * the runtime on demand rather than cached here.
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
 * Assembles a {@link ServiceContext} handle from a runtime that provides the composed components.
 * Resolves the component instances for the legacy handle surface and wires the callbacks that point
 * "up the stack" (recovery, invitation handlers, feed sync).
 */
export const makeServiceContext = async (runtime: ServiceStackRuntime): Promise<ServiceContext> => {
  const state: ServiceLifecycleState = {
    initialized: new Trigger(),
    edgeIdentityUpdateMutex: new Mutex(),
    handlerFactories: new Map(),
    ctx: Context.default(),
    opened: false,
  };

  const components = await runtime.runPromise(
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
    }),
  );
  const edgeConnection = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(EdgeConnectionService)));

  await wireServiceContext(runtime, state);

  log('serviceContext runtimeProps resolved', { hasIdentity: !!components.identityManager.identity });

  return {
    ...components,
    edgeConnection,
    initialized: state.initialized,
    open: (ctx = Context.default()) => openServiceContext(runtime, state, ctx),
    close: (ctx) => closeServiceContext(runtime, state, ctx),
    getInvitationHandler: (invitation) => getInvitationHandler(state, components.identityManager, invitation),
    createIdentity: (params = {}, ctx) => createIdentity(runtime, state, params, ctx),
    whenInitialized: () => state.initialized.wait(),
    broadcastProfileUpdate: (profile) => broadcastProfileUpdate(runtime, profile),
    whenDataSpaceManagerReady: () => whenDataSpaceManagerReady(runtime, state),
    whenEdgeAgentManagerReady: () => whenEdgeAgentManagerReady(runtime, state),
  };
};

/**
 * Wires the components that point "up the stack": the device invitation protocol factory, recovered
 * identity acceptance, the invitation handler factory, and the echo-host feed sync handlers.
 */
const wireServiceContext = async (runtime: ServiceStackRuntime, state: ServiceLifecycleState): Promise<void> => {
  const keyring = await runtime.runPromise(KeyringApiService);
  const identityManager = await runtime.runPromise(IdentityManagerService);
  const recoveryManager = await runtime.runPromise(EdgeIdentityRecoveryManagerService);
  const invitationsManager = await runtime.runPromise(InvitationsManagerService);
  const echoHost = await runtime.runPromise(EchoHostService);
  const feedSyncer = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(FeedSyncerService)));

  state.handlerFactories.set(
    Invitation.Kind.DEVICE,
    () =>
      new DeviceInvitationProtocol(
        keyring,
        () => identityManager.identity ?? failUndefined(),
        (params) => acceptIdentity(runtime, state, params),
      ),
  );

  recoveryManager.setAcceptRecoveredIdentity((params) => acceptIdentity(runtime, state, params));
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
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
  ctx: Context,
): Promise<void> => {
  if (state.opened) {
    return;
  }
  state.ctx = ctx;

  log('running storage migrations...');
  const runtimeProvider = await runtime.runPromise(
    RuntimeProvider.currentRuntime<SqlClient.SqlClient | SqlTransactionTag>(),
  );
  const storageMigrate = await runtime.runPromise(StorageMigrationService);
  await RuntimeProvider.runPromise(runtimeProvider)(storageMigrate);

  await checkStorageVersion(runtime);

  log('running sqlite health check...');
  await runSqliteHealthCheck(runtimeProvider);
  log('sqlite health check passed');

  const identityManager = await runtime.runPromise(IdentityManagerService);
  log('opening identityManager...');
  await identityManager.open(ctx);
  log('identityManager opened', { hasIdentity: !!identityManager.identity });

  log('setting network identity...');
  await setNetworkIdentity(runtime, state, { identity: identityManager.identity });

  const edgeConnection = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(EdgeConnectionService)));
  log('opening edge connection...');
  await edgeConnection?.open(ctx);

  const signalManager = await runtime.runPromise(SignalManagerService);
  log('opening signal manager...');
  await signalManager.open(ctx);

  const networkManager = await runtime.runPromise(SwarmNetworkManagerService);
  log('opening network manager...');
  await networkManager.open();

  // EchoHost open/close is owned by its layer scope (see `echoHostLayer`); the host is already open
  // here, so only the identity/network-bound replicator wiring remains below.
  const echoHost = await runtime.runPromise(EchoHostService);
  const meshReplicator: AutomergeReplicator | undefined = Option.getOrUndefined(
    await runtime.runPromise(Effect.serviceOption(MeshEchoReplicatorService)),
  );
  if (meshReplicator) {
    log('adding mesh replicator...');
    await echoHost.addReplicator(ctx, meshReplicator);
  }
  const echoEdgeReplicator: EdgeAutomergeReplicator | undefined = Option.getOrUndefined(
    await runtime.runPromise(Effect.serviceOption(EdgeAutomergeReplicatorService)),
  );
  if (echoEdgeReplicator) {
    log('adding edge replicator...');
    await echoHost.addReplicator(ctx, echoEdgeReplicator);
  }

  const metadataStore = await runtime.runPromise(IMetadataStoreService);
  log('loading metadata store...');
  await metadataStore.load();

  const spaceManager = await runtime.runPromise(SpaceManagerService);
  log('opening space manager...');
  await spaceManager.open();

  if (identityManager.identity) {
    log('joining network...');
    await identityManager.identity.joinNetwork(ctx);

    log('initializing spaces...');
    await initialize(runtime, state, ctx);
  } else {
    log('no identity, skipping network join and space initialization');
  }

  const feedSyncer = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(FeedSyncerService)));
  log('opening feed syncer...');
  await feedSyncer?.open(ctx);

  const invitationsManager = await runtime.runPromise(InvitationsManagerService);
  log('loading persistent invitations...');
  const loadedInvitations = await invitationsManager.loadPersistentInvitations(ctx);
  log('loaded persistent invitations', { count: loadedInvitations.invitations?.length });

  state.opened = true;
  log('opened');
};

const closeServiceContext = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
  ctx: Context = Context.default(),
): Promise<void> => {
  if (!state.opened) {
    return;
  }
  log('closing...');

  const feedSyncer = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(FeedSyncerService)));
  await feedSyncer?.close();

  const deviceSpaceSync = await runtime.runPromise(CrossDeviceSpaceSynchronizerService);
  await deviceSpaceSync.close?.();

  const dataSpaceManager = await runtime.runPromise(DataSpaceManagerService);
  await dataSpaceManager.close(ctx);

  const edgeAgentManager = await runtime.runPromise(EdgeAgentManagerService);
  await edgeAgentManager.close();

  const identityManager = await runtime.runPromise(IdentityManagerService);
  await identityManager.close(ctx);

  const spaceManager = await runtime.runPromise(SpaceManagerService);
  await spaceManager.close();
  // EchoHost close is owned by its layer scope and runs when the runtime is disposed.

  const networkManager = await runtime.runPromise(SwarmNetworkManagerService);
  await networkManager.close(ctx);

  const signalManager = await runtime.runPromise(SignalManagerService);
  await signalManager.close();

  const edgeConnection = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(EdgeConnectionService)));
  await edgeConnection?.close();

  const feedStore = await runtime.runPromise(FeedStoreService);
  await feedStore.close();

  const metadataStore = await runtime.runPromise(IMetadataStoreService);
  await metadataStore.close();

  state.opened = false;
  log('closed');
};

const createIdentity = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
  params: CreateIdentityOptions = {},
  ctx?: Context,
): Promise<Identity> => {
  ctx ??= state.ctx;
  const identityManager = await runtime.runPromise(IdentityManagerService);
  const identity = await identityManager.createIdentity(params, ctx);
  await setNetworkIdentity(runtime, state, { identity });
  await identity.joinNetwork(ctx);
  await initialize(runtime, state, ctx);
  return identity;
};

const acceptIdentity = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
  params: JoinIdentityProps,
): Promise<Identity> => {
  const identityManager = await runtime.runPromise(IdentityManagerService);
  const { identity, identityRecord } = await identityManager.prepareIdentity(params, state.ctx);
  invariant(params.authorizedDeviceCredential, 'authorizedDeviceCredential is required to accept an identity.');
  await setNetworkIdentity(runtime, state, { deviceCredential: params.authorizedDeviceCredential, identity });
  await identity.joinNetwork(state.ctx);
  await identityManager.acceptIdentity(identity, identityRecord, params.deviceProfile);
  await initialize(runtime, state, state.ctx);
  return identity;
};

const checkStorageVersion = async (runtime: ServiceStackRuntime): Promise<void> => {
  const metadataStore = await runtime.runPromise(IMetadataStoreService);
  await metadataStore.load();
  if (metadataStore.version !== STORAGE_VERSION) {
    throw new InvalidStorageVersionError(STORAGE_VERSION, metadataStore.version);
    // TODO(mykola): Migrate storage to a new version if incompatibility is detected.
  }
};

/**
 * Stage 3: opens the identity-bound services once an identity is available.
 */
const initialize = async (runtime: ServiceStackRuntime, state: ServiceLifecycleState, ctx: Context): Promise<void> => {
  log('_initialize: start');
  const identityManager = await runtime.runPromise(IdentityManagerService);
  const identity = identityManager.identity ?? failUndefined();

  const dataSpaceManager = await runtime.runPromise(DataSpaceManagerService);
  await dataSpaceManager.open(ctx);
  log('_initialize: DataSpaceManager opened');

  const edgeAgentManager = await runtime.runPromise(EdgeAgentManagerService);
  await edgeAgentManager.open(ctx);
  log('_initialize: EdgeAgentManager opened');

  const signingContextProvider = await runtime.runPromise(SigningContextProviderService);
  const keyring = await runtime.runPromise(KeyringApiService);
  state.handlerFactories.set(
    Invitation.Kind.SPACE,
    (invitation) =>
      new SpaceInvitationProtocol(dataSpaceManager, signingContextProvider(), keyring, invitation.spaceKey),
  );
  state.initialized.wake();

  const deviceSpaceSync = await runtime.runPromise(CrossDeviceSpaceSynchronizerService);
  deviceSpaceSync.setIdentity(identity);
  await deviceSpaceSync.open?.(ctx);
};

const setNetworkIdentity = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
  params?: { deviceCredential?: Credential; identity?: Identity },
): Promise<void> => {
  log('_setNetworkIdentity: acquiring mutex...');
  using _guard = await state.edgeIdentityUpdateMutex.acquire();
  log('_setNetworkIdentity: mutex acquired');

  const networkManager = await runtime.runPromise(SwarmNetworkManagerService);
  const edgeConnection = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(EdgeConnectionService)));
  const edgeHttpClient = Option.getOrUndefined(await runtime.runPromise(Effect.serviceOption(EdgeHttpClientService)));

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
  runtime: ServiceStackRuntime,
  profile: ProfileDocument | undefined,
): Promise<void> => {
  if (!profile) {
    return;
  }

  const dataSpaceManager = await runtime.runPromise(DataSpaceManagerService);
  for (const space of dataSpaceManager.spaces.values()) {
    await space.updateOwnProfile(profile);
  }
};

/**
 * Resolves the {@link DataSpaceManager} once identity-bound services have opened (`initialized`).
 */
const whenDataSpaceManagerReady = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
): Promise<DataSpaceManager> => {
  await state.initialized.wait();
  return runtime.runPromise(DataSpaceManagerService);
};

/**
 * Resolves the {@link EdgeAgentManager} once identity-bound services have opened (`initialized`).
 */
const whenEdgeAgentManagerReady = async (
  runtime: ServiceStackRuntime,
  state: ServiceLifecycleState,
): Promise<EdgeAgentManager> => {
  await state.initialized.wait();
  return runtime.runPromise(EdgeAgentManagerService);
};
