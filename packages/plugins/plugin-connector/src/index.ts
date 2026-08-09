//
// Copyright 2025 DXOS.org
//

export { ATMOSPHERE_PROVIDER_ID, ATMOSPHERE_SOURCE, ATPROTO_OAUTH_SCOPES } from './constants';
export { CONNECTOR_AUTH_GROUP_ID, type ConnectorAuthActionsOptions, connectorAuthActions } from './util';
export { ConnectionTestError } from './errors';
export * from './meta';
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
export * as Connection from './types/Connection';
export * as ConnectorEvents from './types/ConnectorEvents';
export * as ConnectorOperation from './types/ConnectorOperation';
export * as ConnectorAnnotations from './types/ConnectorAnnotations';
export * as ConnectorCoordination from './types/ConnectorCoordination';
export * as ConnectorForm from './types/ConnectorForm';
export * as ConnectorSpec from './types/ConnectorSpec';
