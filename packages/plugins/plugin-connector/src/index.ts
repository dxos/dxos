//
// Copyright 2025 DXOS.org
//

export * as ConnectorPlugin from './ConnectorPlugin';
export { ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, type ConnectorAuthActionsOptions, connectorAuthActions } from './util';
export { ConnectionAuthExpiredError, ConnectionTestError, SyncRoutineMissingError } from './errors';
export { SyncTemplateId, makeSyncTemplate } from './templates';
export * from '#meta';
export {
  autoBindSingleConnection,
  bindConnectionToTarget,
  connectorIdsForTarget,
  findBindingForTarget,
  findSyncTriggerForBinding,
  findSyncTriggerForConnection,
  fireSyncTrigger,
  isCursorForConnection,
  isCursorForTarget,
  runConnectionSync,
  scaffoldConnectionSyncRoutine,
  syncConnectionBindings,
  syncConnectionOrOfferRoutine,
  syncTarget,
} from './util';
export * from '#types';
