//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type QueueService } from '@dxos/protocols';
import { QueueService as BufQueueService } from '@dxos/protocols/buf/dxos/client/queue_pb';
import { QueryService as BufQueryService } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { DataService as BufDataService } from '@dxos/protocols/buf/dxos/echo/service_pb';
import { schema } from '@dxos/protocols/proto';
import type {
  ContactsService,
  DevicesService,
  EdgeAgentService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/proto/dxos/client/services';
import type { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import type { AppService, ShellService, WorkerService } from '@dxos/protocols/proto/dxos/iframe';
import type { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import type { TracingService } from '@dxos/protocols/proto/dxos/tracing';
import {
  type BufRpcClient,
  type BufRpcHandlers,
  type ServiceBundle,
  createBufServiceBundle,
  createServiceBundle,
} from '@dxos/rpc';

export { type QueueService } from '@dxos/protocols';

//
// Buf service re-exports.
//
export { DataService as BufDataService } from '@dxos/protocols/buf/dxos/echo/service_pb';
export { QueryService as BufQueryService } from '@dxos/protocols/buf/dxos/echo/query_pb';
export { QueueService as BufQueueService } from '@dxos/protocols/buf/dxos/client/queue_pb';

// Re-export buf message types.
export type {
  SubscribeRequest as BufSubscribeRequest,
  BatchedDocumentUpdates as BufBatchedDocumentUpdates,
  UpdateSubscriptionRequest as BufUpdateSubscriptionRequest,
  CreateDocumentRequest as BufCreateDocumentRequest,
  CreateDocumentResponse as BufCreateDocumentResponse,
  UpdateRequest as BufUpdateRequest,
  FlushRequest as BufFlushRequest,
  DocumentUpdate as BufDocumentUpdate,
  GetDocumentHeadsRequest as BufGetDocumentHeadsRequest,
  GetDocumentHeadsResponse as BufGetDocumentHeadsResponse,
  WaitUntilHeadsReplicatedRequest as BufWaitUntilHeadsReplicatedRequest,
  ReIndexHeadsRequest as BufReIndexHeadsRequest,
  GetSpaceSyncStateRequest as BufGetSpaceSyncStateRequest,
  SpaceSyncState as BufSpaceSyncState,
  DocHeadsList as BufDocHeadsList,
} from '@dxos/protocols/buf/dxos/echo/service_pb';

export {
  SubscribeRequestSchema as BufSubscribeRequestSchema,
  BatchedDocumentUpdatesSchema as BufBatchedDocumentUpdatesSchema,
  UpdateSubscriptionRequestSchema as BufUpdateSubscriptionRequestSchema,
  CreateDocumentRequestSchema as BufCreateDocumentRequestSchema,
  CreateDocumentResponseSchema as BufCreateDocumentResponseSchema,
  UpdateRequestSchema as BufUpdateRequestSchema,
  FlushRequestSchema as BufFlushRequestSchema,
  DocumentUpdateSchema as BufDocumentUpdateSchema,
  GetDocumentHeadsRequestSchema as BufGetDocumentHeadsRequestSchema,
  GetDocumentHeadsResponseSchema as BufGetDocumentHeadsResponseSchema,
  WaitUntilHeadsReplicatedRequestSchema as BufWaitUntilHeadsReplicatedRequestSchema,
  ReIndexHeadsRequestSchema as BufReIndexHeadsRequestSchema,
  GetSpaceSyncStateRequestSchema as BufGetSpaceSyncStateRequestSchema,
  SpaceSyncStateSchema as BufSpaceSyncStateSchema,
  DocHeadsListSchema as BufDocHeadsListSchema,
} from '@dxos/protocols/buf/dxos/echo/service_pb';

export type {
  QueryRequest as BufQueryRequest,
  QueryResponse as BufQueryResponse,
  QueryResult as BufQueryResult,
} from '@dxos/protocols/buf/dxos/echo/query_pb';

export {
  QueryRequestSchema as BufQueryRequestSchema,
  QueryResponseSchema as BufQueryResponseSchema,
  QueryResultSchema as BufQueryResultSchema,
  QueryReactivity as BufQueryReactivity,
} from '@dxos/protocols/buf/dxos/echo/query_pb';

export type {
  QueueQuery as BufQueueQuery,
  QueueQueryResult as BufQueueQueryResult,
  QueryQueueRequest as BufQueryQueueRequest,
  InsertIntoQueueRequest as BufInsertIntoQueueRequest,
  DeleteFromQueueRequest as BufDeleteFromQueueRequest,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

export {
  QueueQuerySchema as BufQueueQuerySchema,
  QueueQueryResultSchema as BufQueueQueryResultSchema,
  QueryQueueRequestSchema as BufQueryQueueRequestSchema,
  InsertIntoQueueRequestSchema as BufInsertIntoQueueRequestSchema,
  DeleteFromQueueRequestSchema as BufDeleteFromQueueRequestSchema,
} from '@dxos/protocols/buf/dxos/client/queue_pb';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  SystemService: SystemService;
  NetworkService: NetworkService;
  LoggingService: LoggingService;

  IdentityService: IdentityService;
  InvitationsService: InvitationsService;
  DevicesService: DevicesService;
  SpacesService: SpacesService;

  DataService: DataService;
  QueryService: QueryService;
  QueueService: QueueService;

  ContactsService: ContactsService;
  EdgeAgentService: EdgeAgentService;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHost;

  TracingService: TracingService;
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

  descriptors: ServiceBundle<ClientServices>;
  services: Partial<ClientServices>;

  // TODO(burdon): Should take context from parent?
  open(): Promise<unknown>;
  close(): Promise<unknown>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),
  LoggingService: schema.getService('dxos.client.services.LoggingService'),

  IdentityService: schema.getService('dxos.client.services.IdentityService'),
  QueryService: schema.getService('dxos.echo.query.QueryService'),
  InvitationsService: schema.getService('dxos.client.services.InvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  ContactsService: schema.getService('dxos.client.services.ContactsService'),
  EdgeAgentService: schema.getService('dxos.client.services.EdgeAgentService'),
  QueueService: schema.getService('dxos.client.services.QueueService'),

  // TODO(burdon): Deprecated.
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.tracing.TracingService'),
});

export type IframeServiceBundle = {
  BridgeService: BridgeService;
};

export const iframeServiceBundle: ServiceBundle<IframeServiceBundle> = {
  BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
};

export type WorkerServiceBundle = {
  WorkerService: WorkerService;
};

export const workerServiceBundle: ServiceBundle<WorkerServiceBundle> = {
  WorkerService: schema.getService('dxos.iframe.WorkerService'),
};

export type AppServiceBundle = {
  AppService: AppService;
};

export const appServiceBundle: ServiceBundle<AppServiceBundle> = {
  AppService: schema.getService('dxos.iframe.AppService'),
};

export type ShellServiceBundle = {
  ShellService: ShellService;
};

export const shellServiceBundle: ServiceBundle<ShellServiceBundle> = {
  ShellService: schema.getService('dxos.iframe.ShellService'),
};

//
// Buf service types and bundles.
//

/**
 * ECHO services using buf types.
 */
export type BufEchoServices = {
  DataService: typeof BufDataService;
  QueryService: typeof BufQueryService;
  QueueService: typeof BufQueueService;
};

/**
 * Service bundle for ECHO buf services.
 */
export const bufEchoServiceBundle = createBufServiceBundle<BufEchoServices>({
  DataService: BufDataService,
  QueryService: BufQueryService,
  QueueService: BufQueueService,
});

/**
 * Client type for ECHO buf services.
 */
export type BufEchoServicesClient = {
  DataService: BufRpcClient<typeof BufDataService>;
  QueryService: BufRpcClient<typeof BufQueryService>;
  QueueService: BufRpcClient<typeof BufQueueService>;
};

/**
 * Handler type for ECHO buf services.
 */
export type BufEchoServicesHandlers = {
  DataService: BufRpcHandlers<typeof BufDataService>;
  QueryService: BufRpcHandlers<typeof BufQueryService>;
  QueueService: BufRpcHandlers<typeof BufQueueService>;
};
