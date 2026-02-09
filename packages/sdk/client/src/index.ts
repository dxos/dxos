//
// Copyright 2020 DXOS.org
//

export { type ClientServices, type ClientServicesProvider, type ShellRuntime } from '@dxos/client-protocol';
export { Config, ConfigService, Defaults, Dynamics, Envs, Local, Remote, Storage } from '@dxos/config';
export { PublicKey, type PublicKeyLike } from '@dxos/keys';
export {
  AlreadyJoinedError,
  ApiError,
  CancelledError,
  DataCorruptionError,
  DatabaseError,
  EntityNotFoundError,
  InvalidConfigError,
  InvalidInvitationError,
  InvalidInvitationExtensionRoleError,
  IdentityNotInitializedError,
  InvalidStorageVersionError,
  RemoteServiceConnectionError,
  RemoteServiceConnectionTimeout,
  RpcClosedError,
  RpcNotOpenError,
  SystemError,
  UnknownModelError,
} from '@dxos/protocols';
export { SystemStatus } from '@dxos/protocols/proto/dxos/client/services';
export {
  type AppContextRequest,
  type LayoutRequest,
  type InvitationUrlRequest,
  ShellDisplay,
  ShellLayout,
} from '@dxos/protocols/proto/dxos/iframe';

// TODO(burdon): Use "export *" and @internal to restrict exports.
// TODO(wittjosiah): Should all api errors be exported here?

// For some reason the * re-export from ./client gets removed by TSC. Looks like a compiler bug.
export { Client } from './client';
export * from './client';
export * from './services';
export * from './util';
export * from './version';
