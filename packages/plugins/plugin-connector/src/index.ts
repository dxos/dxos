//
// Copyright 2025 DXOS.org
//

export { ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, type ConnectorAuthActionsOptions, connectorAuthActions } from './util';
export { ConnectionTestError, TargetAccountMismatchError } from './errors';
export * from './meta';
export {
  type LiveBinding,
  type TargetAccountCheck,
  autoBindSingleConnection,
  bindConnectionToTarget,
  checkTargetAccount,
  connectorIdsForTarget,
  createSyncRoutine,
  ensureSyncTrigger,
  findBindingForTarget,
  findLiveBinding,
  findLiveBindingForTarget,
  findOrphanedBindings,
  findOrphanedBindingsForTarget,
  findSyncTriggerForBinding,
  fireSyncTrigger,
  isCursorForConnection,
  isCursorForTarget,
  isTargetAccountMismatch,
  isTokenForConnection,
  prepareTargetBinding,
  readTargetAccount,
  recordTargetAccount,
  removeBinding,
  reportTargetAccountMismatch,
  setSyncTriggerEnabled,
  suspendConnectionBindings,
  syncBinding,
  syncTarget,
} from './util';
export * as ConnectorEvents from './types/ConnectorEvents';
export * as ConnectorOperation from './types/ConnectorOperation';
export * as ConnectorAnnotations from './types/ConnectorAnnotations';
export * as ConnectorCoordination from './types/ConnectorCoordination';
export * as ConnectorForm from './types/ConnectorForm';
export * as ConnectorSpec from './types/ConnectorSpec';
