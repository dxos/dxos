//
// Copyright 2024 DXOS.org
//

import { QueueService as BufQueueService } from '@dxos/protocols/buf/dxos/client/queue_pb';
import { QueryService as BufQueryService } from '@dxos/protocols/buf/dxos/echo/query_pb';
import { DataService as BufDataService } from '@dxos/protocols/buf/dxos/echo/service_pb';
import { type BufRpcClient, type BufRpcHandlers, createBufServiceBundle } from '@dxos/rpc';

// Re-export buf service types.
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
