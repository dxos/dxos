//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import type { Stream } from '@dxos/async';
import { getBufService } from '@dxos/protocols/buf-service';
import type { Invitation } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import type { LogEntry, QueryLogsRequest } from '@dxos/protocols/buf/dxos/client/logging_pb';
import type { QueryInvitationsResponse } from '@dxos/protocols/buf/dxos/client/services_pb';
import { Config } from '@dxos/protocols/buf/dxos/config_pb';
import type { SignalResponse, SubscribeToSpacesResponse } from '@dxos/protocols/buf/dxos/devtools/host_pb';
import type {
  GetSpaceSnapshotResponse,
  SaveSpaceSnapshotResponse,
  SubscribeToFeedBlocksResponse,
  SubscribeToMetadataResponse,
} from '@dxos/protocols/proto/dxos/devtools/host';
import type { IndexConfig } from '@dxos/protocols/proto/dxos/echo/indexing';
import type {
  QueryRequest as EchoQueryRequest,
  QueryResponse as EchoQueryResponse,
} from '@dxos/protocols/proto/dxos/echo/query';
import type { SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import type {
  QueryRequest as EdgeQueryRequest,
  JoinRequest,
  LeaveRequest,
  Message,
} from '@dxos/protocols/proto/dxos/edge/signal';
import type {
  Credential,
  DeviceProfileDocument,
  Presentation,
  ProfileDocument,
} from '@dxos/protocols/proto/dxos/halo/credentials';
import type {
  CreateEpochResponse,
  Device,
  Identity,
  JoinSpaceResponse,
  NetworkStatus,
  Platform,
  QueryAgentStatusResponse,
  QueryEdgeStatusResponse,
  QuerySpacesResponse,
  RecoverIdentityRequest,
  Space,
} from '@dxos/protocols/proto/dxos/client/services';
import type { AppService, ShellService } from '@dxos/protocols/proto/dxos/iframe';
import type { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import type {
  DataService as RpcDataService,
  DevicesService as RpcDevicesService,
  DevtoolsHost as RpcDevtoolsHost,
  FeedService as RpcFeedService,
  IdentityService as RpcIdentityService,
  InvitationsService as RpcInvitationsService,
  LoggingService as RpcLoggingService,
  NetworkService as RpcNetworkService,
  SpacesService as RpcSpacesService,
  SystemService as RpcSystemService,
} from '@dxos/protocols/rpc';
import type { RequestOptions } from '@dxos/protocols/service-contract';
import { type ServiceBundle } from '@dxos/rpc';

import { type ClientServicesRpc } from './service-rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

/**
 * Promise/{@link Stream} shaped deprecated surfaces for the client services whose protobuf
 * `service {}` block has been deleted (their payloads now serve entirely over effect-rpc — see
 * `@dxos/protocols/rpc`). Each interface is hand-derived to match the codec-protobuf-generated
 * shape it replaces exactly, so existing `client.services.services.<Name>` consumers are
 * unaffected. Message types that are still shared outside the RPC boundary (and so remain
 * `protoMessage`-encoded in `.proto`) are imported from there; the rest come from the effect-rpc
 * definitions in `@dxos/protocols/rpc`.
 */
export interface EdgeAgentServicePromise {
  createAgent: (request: void, options?: RequestOptions) => Promise<void>;
  queryEdgeStatus: (request: void, options?: RequestOptions) => Stream<QueryEdgeStatusResponse>;
  queryAgentStatus: (request: void, options?: RequestOptions) => Stream<QueryAgentStatusResponse>;
}

export interface DevicesServicePromise {
  updateDevice: (request: DeviceProfileDocument, options?: RequestOptions) => Promise<Device>;
  queryDevices: (request: void, options?: RequestOptions) => Stream<RpcDevicesService.QueryDevicesResponse>;
}

export interface FeedServicePromise {
  queryFeed: (
    request: RpcFeedService.QueryFeedRequest,
    options?: RequestOptions,
  ) => Promise<RpcFeedService.FeedQueryResult>;
  insertIntoFeed: (request: RpcFeedService.InsertIntoFeedRequest, options?: RequestOptions) => Promise<void>;
  deleteFromFeed: (request: RpcFeedService.DeleteFromFeedRequest, options?: RequestOptions) => Promise<void>;
  syncFeed: (request: RpcFeedService.SyncFeedRequest, options?: RequestOptions) => Promise<void>;
  getSyncState: (
    request: RpcFeedService.GetSyncStateRequest,
    options?: RequestOptions,
  ) => Promise<RpcFeedService.GetSyncStateResponse>;
}

export interface IdentityServicePromise {
  createIdentity: (request: RpcIdentityService.CreateIdentityRequest, options?: RequestOptions) => Promise<Identity>;
  requestRecoveryChallenge: (
    request: void,
    options?: RequestOptions,
  ) => Promise<RpcIdentityService.RequestRecoveryChallengeResponse>;
  recoverIdentity: (request: RecoverIdentityRequest, options?: RequestOptions) => Promise<Identity>;
  createRecoveryCredential: (
    request: RpcIdentityService.CreateRecoveryCredentialRequest,
    options?: RequestOptions,
  ) => Promise<RpcIdentityService.CreateRecoveryCredentialResponse>;
  revokeRecoveryCredential: (
    request: RpcIdentityService.RevokeRecoveryCredentialRequest,
    options?: RequestOptions,
  ) => Promise<void>;
  queryIdentity: (request: void, options?: RequestOptions) => Stream<RpcIdentityService.QueryIdentityResponse>;
  updateProfile: (request: ProfileDocument, options?: RequestOptions) => Promise<Identity>;
  signPresentation: (
    request: RpcIdentityService.SignPresentationRequest,
    options?: RequestOptions,
  ) => Promise<Presentation>;
  createAuthCredential: (request: void, options?: RequestOptions) => Promise<Credential>;
}

export interface InvitationsServicePromise {
  createInvitation: (request: Invitation, options?: RequestOptions) => Stream<Invitation>;
  acceptInvitation: (
    request: RpcInvitationsService.AcceptInvitationRequest,
    options?: RequestOptions,
  ) => Stream<Invitation>;
  authenticate: (request: RpcInvitationsService.AuthenticationRequest, options?: RequestOptions) => Promise<void>;
  cancelInvitation: (request: RpcInvitationsService.CancelInvitationRequest, options?: RequestOptions) => Promise<void>;
  queryInvitations: (request: void, options?: RequestOptions) => Stream<QueryInvitationsResponse>;
}

export interface LoggingServicePromise {
  controlMetrics: (
    request: RpcLoggingService.ControlMetricsRequest,
    options?: RequestOptions,
  ) => Promise<RpcLoggingService.ControlMetricsResponse>;
  queryMetrics: (
    request: RpcLoggingService.QueryMetricsRequest,
    options?: RequestOptions,
  ) => Stream<RpcLoggingService.QueryMetricsResponse>;
  queryLogs: (request: QueryLogsRequest, options?: RequestOptions) => Stream<LogEntry>;
}

export interface NetworkServicePromise {
  updateConfig: (request: RpcNetworkService.UpdateConfigRequest, options?: RequestOptions) => Promise<void>;
  queryStatus: (request: void, options?: RequestOptions) => Stream<NetworkStatus>;
  joinSwarm: (request: JoinRequest, options?: RequestOptions) => Promise<void>;
  leaveSwarm: (request: LeaveRequest, options?: RequestOptions) => Promise<void>;
  querySwarm: (request: EdgeQueryRequest, options?: RequestOptions) => Promise<SwarmResponse>;
  subscribeSwarmState: (
    request: RpcNetworkService.SubscribeSwarmStateRequest,
    options?: RequestOptions,
  ) => Stream<SwarmResponse>;
  sendMessage: (request: Message, options?: RequestOptions) => Promise<void>;
  subscribeMessages: (request: RpcNetworkService.SubscribeMessagesRequest, options?: RequestOptions) => Stream<Message>;
}

export interface SystemServicePromise {
  getConfig: (request: void, options?: RequestOptions) => Promise<Config>;
  getDiagnostics: (
    request: RpcSystemService.GetDiagnosticsRequest,
    options?: RequestOptions,
  ) => Promise<RpcSystemService.GetDiagnosticsResponse>;
  updateStatus: (request: RpcSystemService.UpdateStatusRequest, options?: RequestOptions) => Promise<void>;
  queryStatus: (
    request: RpcSystemService.QueryStatusRequest,
    options?: RequestOptions,
  ) => Stream<RpcSystemService.QueryStatusResponse>;
  reset: (request: void, options?: RequestOptions) => Promise<void>;
  getPlatform: (request: void, options?: RequestOptions) => Promise<Platform>;
}

export interface QueryServicePromise {
  setConfig: (request: IndexConfig, options?: RequestOptions) => Promise<void>;
  execQuery: (request: EchoQueryRequest, options?: RequestOptions) => Stream<EchoQueryResponse>;
  reindex: (request: void, options?: RequestOptions) => Promise<void>;
}

export interface DataServicePromise {
  subscribe: (
    request: RpcDataService.SubscribeRequest,
    options?: RequestOptions,
  ) => Stream<RpcDataService.BatchedDocumentUpdates>;
  updateSubscription: (request: RpcDataService.UpdateSubscriptionRequest, options?: RequestOptions) => Promise<void>;
  createDocument: (
    request: RpcDataService.CreateDocumentRequest,
    options?: RequestOptions,
  ) => Promise<RpcDataService.CreateDocumentResponse>;
  update: (request: RpcDataService.UpdateRequest, options?: RequestOptions) => Promise<void>;
  flush: (request: RpcDataService.FlushRequest, options?: RequestOptions) => Promise<void>;
  getDocumentHeads: (
    request: RpcDataService.GetDocumentHeadsRequest,
    options?: RequestOptions,
  ) => Promise<RpcDataService.GetDocumentHeadsResponse>;
  waitUntilHeadsReplicated: (
    request: RpcDataService.WaitUntilHeadsReplicatedRequest,
    options?: RequestOptions,
  ) => Promise<void>;
  reIndexHeads: (request: RpcDataService.ReIndexHeadsRequest, options?: RequestOptions) => Promise<void>;
  updateIndexes: (request: void, options?: RequestOptions) => Promise<void>;
  subscribeSpaceSyncState: (
    request: RpcDataService.GetSpaceSyncStateRequest,
    options?: RequestOptions,
  ) => Stream<RpcDataService.SpaceSyncState>;
  stats: (
    request: RpcDataService.DatabaseStatsRequest,
    options?: RequestOptions,
  ) => Promise<RpcDataService.DatabaseStats>;
  runGarbageCollection: (
    request: RpcDataService.RunGarbageCollectionRequest,
    options?: RequestOptions,
  ) => Promise<RpcDataService.GarbageCollectionReport>;
}

export interface DevtoolsHostPromise {
  events: (request: void, options?: RequestOptions) => Stream<RpcDevtoolsHost.Event>;
  getConfig: (request: void, options?: RequestOptions) => Promise<RpcDevtoolsHost.GetConfigResponse>;
  getStorageInfo: (request: void, options?: RequestOptions) => Promise<RpcDevtoolsHost.StorageInfo>;
  resetStorage: (request: RpcDevtoolsHost.ResetStorageRequest, options?: RequestOptions) => Promise<void>;
  getSnapshots: (request: void, options?: RequestOptions) => Promise<RpcDevtoolsHost.GetSnapshotsResponse>;
  enableDebugLogging: (
    request: RpcDevtoolsHost.EnableDebugLoggingRequest,
    options?: RequestOptions,
  ) => Promise<RpcDevtoolsHost.EnableDebugLoggingResponse>;
  disableDebugLogging: (
    request: RpcDevtoolsHost.EnableDebugLoggingRequest,
    options?: RequestOptions,
  ) => Promise<RpcDevtoolsHost.EnableDebugLoggingResponse>;
  subscribeToKeyringKeys: (
    request: RpcDevtoolsHost.SubscribeToKeyringKeysRequest,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToKeyringKeysResponse>;
  subscribeToCredentialMessages: (
    request: RpcDevtoolsHost.SubscribeToCredentialMessagesRequest,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToCredentialMessagesResponse>;
  subscribeToSpaces: (
    request: RpcDevtoolsHost.SubscribeToSpacesRequest,
    options?: RequestOptions,
  ) => Stream<SubscribeToSpacesResponse>;
  subscribeToItems: (
    request: RpcDevtoolsHost.SubscribeToItemsRequest,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToItemsResponse>;
  subscribeToFeeds: (
    request: RpcDevtoolsHost.SubscribeToFeedsRequest,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToFeedsResponse>;
  subscribeToFeedBlocks: (
    request: RpcDevtoolsHost.SubscribeToFeedBlocksRequest,
    options?: RequestOptions,
  ) => Stream<SubscribeToFeedBlocksResponse>;
  subscribeToMetadata: (request: void, options?: RequestOptions) => Stream<SubscribeToMetadataResponse>;
  getSpaceSnapshot: (
    request: RpcDevtoolsHost.GetSpaceSnapshotRequest,
    options?: RequestOptions,
  ) => Promise<GetSpaceSnapshotResponse>;
  saveSpaceSnapshot: (
    request: RpcDevtoolsHost.SaveSpaceSnapshotRequest,
    options?: RequestOptions,
  ) => Promise<SaveSpaceSnapshotResponse>;
  clearSnapshots: (request: RpcDevtoolsHost.ClearSnapshotsRequest, options?: RequestOptions) => Promise<void>;
  getNetworkPeers: (
    request: RpcDevtoolsHost.GetNetworkPeersRequest,
    options?: RequestOptions,
  ) => Promise<RpcDevtoolsHost.GetNetworkPeersResponse>;
  subscribeToNetworkTopics: (
    request: void,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToNetworkTopicsResponse>;
  subscribeToSignalStatus: (
    request: void,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToSignalStatusResponse>;
  subscribeToSignal: (request: void, options?: RequestOptions) => Stream<SignalResponse>;
  subscribeToSwarmInfo: (
    request: RpcDevtoolsHost.SubscribeToSwarmInfoRequest,
    options?: RequestOptions,
  ) => Stream<RpcDevtoolsHost.SubscribeToSwarmInfoResponse>;
  exportSqliteDatabase: (
    request: void,
    options?: RequestOptions,
  ) => Promise<RpcDevtoolsHost.ExportSqliteDatabaseResponse>;
  runSqliteQuery: (
    request: RpcDevtoolsHost.RunSqliteQueryRequest,
    options?: RequestOptions,
  ) => Promise<RpcDevtoolsHost.RunSqliteQueryResponse>;
}

export interface SpacesServicePromise {
  createSpace: (request: RpcSpacesService.CreateSpaceRequest, options?: RequestOptions) => Promise<Space>;
  updateSpace: (request: RpcSpacesService.UpdateSpaceRequest, options?: RequestOptions) => Promise<void>;
  querySpaces: (request: void, options?: RequestOptions) => Stream<QuerySpacesResponse>;
  updateMemberRole: (request: RpcSpacesService.UpdateMemberRoleRequest, options?: RequestOptions) => Promise<void>;
  admitContact: (request: RpcSpacesService.AdmitContactRequest, options?: RequestOptions) => Promise<void>;
  joinBySpaceKey: (
    request: RpcSpacesService.JoinBySpaceKeyRequest,
    options?: RequestOptions,
  ) => Promise<JoinSpaceResponse>;
  postMessage: (request: RpcSpacesService.PostMessageRequest, options?: RequestOptions) => Promise<void>;
  subscribeMessages: (
    request: RpcSpacesService.SubscribeMessagesRequest,
    options?: RequestOptions,
  ) => Stream<GossipMessage>;
  writeCredentials: (request: RpcSpacesService.WriteCredentialsRequest, options?: RequestOptions) => Promise<void>;
  queryCredentials: (request: RpcSpacesService.QueryCredentialsRequest, options?: RequestOptions) => Stream<Credential>;
  createEpoch: (request: RpcSpacesService.CreateEpochRequest, options?: RequestOptions) => Promise<CreateEpochResponse>;
  exportSpace: (
    request: RpcSpacesService.ExportSpaceRequest,
    options?: RequestOptions,
  ) => Promise<RpcSpacesService.ExportSpaceResponse>;
  importSpace: (
    request: RpcSpacesService.ImportSpaceRequest,
    options?: RequestOptions,
  ) => Promise<RpcSpacesService.ImportSpaceResponse>;
}

export type ClientServices = {
  SystemService: SystemServicePromise;
  NetworkService: NetworkServicePromise;
  LoggingService: LoggingServicePromise;

  IdentityService: IdentityServicePromise;
  InvitationsService: InvitationsServicePromise;
  DevicesService: DevicesServicePromise;
  SpacesService: SpacesServicePromise;

  DataService: DataServicePromise;
  QueryService: QueryServicePromise;
  FeedService: FeedServicePromise;

  EdgeAgentService: EdgeAgentServicePromise;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHostPromise;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  /**
   * The connection to the services provider was terminated.
   * This should fire if the services disconnect unexpectedly or during a client reset.
   */
  closed: Event<Error | undefined>;

  /**
   * The underlying service connection was re-established.
   * Fires after all reconnection callbacks have completed.
   */
  reconnected?: Event<void>;

  /**
   * Register a callback to be invoked when services reconnect.
   * The callback should re-establish any RPC streams.
   * Reconnection waits for all callbacks to complete before emitting `reconnected`.
   */
  onReconnect?: (callback: () => Promise<void>) => void;

  /**
   * Effect-native client for all client services, inferred from the effect-rpc definitions.
   * Preferred surface for new consumers; must be re-read after reconnect rather than cached.
   * Effects it produces require only the default runtime and can be run with any `Runtime<never>`.
   */
  rpc: ClientServicesRpc;

  /**
   * @deprecated Prefer {@link rpc}. Promise/`Stream` shaped services derived from {@link rpc}.
   */
  services: Partial<ClientServices>;

  // TODO(burdon): Should take context from parent?
  open(): Promise<unknown>;
  close(): Promise<unknown>;
}

export type AppServiceBundle = {
  AppService: AppService;
};

export const appServiceBundle: ServiceBundle<AppServiceBundle> = {
  AppService: getBufService<AppService>('dxos.iframe.AppService'),
};

export type ShellServiceBundle = {
  ShellService: ShellService;
};

export const shellServiceBundle: ServiceBundle<ShellServiceBundle> = {
  ShellService: getBufService<ShellService>('dxos.iframe.ShellService'),
};
