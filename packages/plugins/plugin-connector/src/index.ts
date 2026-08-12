//
// Copyright 2025 DXOS.org
//

export { ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, type ConnectorAuthActionsOptions, connectorAuthActions } from './util';
export { ConnectionTestError } from './errors';
export * from './meta';
export {
  type LiveBinding,
  autoBindSingleConnection,
  bindConnectionToTarget,
  connectorIdsForTarget,
  createSyncRoutine,
  ensureSyncTrigger,
  findBindingForTarget,
  findLiveBinding,
  findLiveBindingForTarget,
  findSyncTriggerForBinding,
  fireSyncTrigger,
  isCursorForConnection,
  isCursorForTarget,
  removeOrphanedBindings,
  syncBinding,
  syncTarget,
} from './util';
export * as ConnectorEvents from './types/ConnectorEvents';
export * as ConnectorOperation from './types/ConnectorOperation';
export * as ConnectorAnnotations from './types/ConnectorAnnotations';
export * as ConnectorCoordination from './types/ConnectorCoordination';
export * as ConnectorForm from './types/ConnectorForm';
export * as ConnectorSpec from './types/ConnectorSpec';
