//
// Copyright 2020 DXOS.org
//

export { Config, Defaults, Dynamics, Envs, Local } from '@dxos/config';

// TODO(burdon): Remove (create wrapper class).
// export { generateSeedPhrase } from '@dxos/credentials';

// export {
//   TYPE_SCHEMA,
//   Item,
//   ResultSet,
//   Schema,
//   ShowDeletedOption,
//   type QueryOptions,
//   type SchemaDef,
//   type SchemaField,
//   type SchemaRef,
// } from '@dxos/echo-db';

// TODO(burdon): Tighten export.
// export * from '@dxos/echo-schema';

export { PublicKey, type PublicKeyLike } from '@dxos/keys';

// TODO(burdon): Export form `@dxos/echo-db`.
// export { type ItemID, DocumentModel } from '@dxos/document-model';
// export { TextModel } from '@dxos/text-model';
export { ApiError } from '@dxos/errors';

// export {
//   type Contact,
//   type Identity,
//   Invitation,
//   SpaceMember,
//   SpaceState,
//   SystemStatus,
// } from '@dxos/protocols/proto/dxos/client/services';
// export type { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
// export { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';

// TODO(burdon): Cherry-pick developer-facings APIs.
// export * from './packlets/client';
export { Client, ClientOptions } from './client';

// TODO(burdon): Remove (currently required for @dxos/client-testing).
// export type { EchoProxy } from './packlets/proxies/echo-proxy';
// export type { HaloProxy } from './packlets/proxies/halo-proxy';
// export type { InvitationsProxy } from './packlets/proxies/invitations-proxy';
// export type { MeshProxy } from './packlets/proxies/mesh-proxy';
// export type { ShellController } from './packlets/proxies/shell-controller';
// export { ClientServicesProxy } from './proxies/service-proxy';
// export type { SpaceProxy } from './packlets/proxies/space-proxy';

// TODO(burdon): Create separate export like testing?
// export * from './packlets/devtools';
// export * from './packlets/diagnostics';
