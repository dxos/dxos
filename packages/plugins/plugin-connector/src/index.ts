//
// Copyright 2025 DXOS.org
//

export * as ConnectorPlugin from './ConnectorPlugin';
export { ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, type ConnectorAuthActionsOptions, connectorAuthActions } from './util';
export { ConnectionTestError } from './errors';
export * from '#meta';
export {
  autoBindSingleConnection,
  bindConnectionToTarget,
  connectorIdsForTarget,
  createSyncRoutine,
  ensureSyncTrigger,
  findBindingForTarget,
  findSyncTriggerForBinding,
  fireSyncTrigger,
  isCursorForConnection,
  isCursorForTarget,
  syncBinding,
  syncTarget,
} from './util';
export * from '#types';
