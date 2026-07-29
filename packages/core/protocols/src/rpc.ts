//
// Copyright 2026 DXOS.org
//

// Effect RPC service definitions.
// Kept out of the main barrel because they transitively load the protobufjs-backed proto codec,
// which must not leak into edge/workerd bundles that only need the proto types or error classes.

export * from './service-rpc.ts';
export * as BridgeService from './BridgeService.ts';
export * as ContactsService from './ContactsService.ts';
export * as DataService from './DataService.ts';
export * as DevicesService from './DevicesService.ts';
export * as DevtoolsHost from './DevtoolsHost.ts';
export * as EdgeAgentService from './EdgeAgentService.ts';
export * as FeedService from './FeedService.ts';
export * as IdentityService from './IdentityService.ts';
export * as InvitationsService from './InvitationsService.ts';
export * as LoggingService from './LoggingService.ts';
export * as NetworkService from './NetworkService.ts';
export * as QueryService from './QueryService.ts';
export * as SpacesService from './SpacesService.ts';
export * as SystemService from './SystemService.ts';
export * as WorkerService from './WorkerService.ts';
