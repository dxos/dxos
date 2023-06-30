//
// Copyright 2020 DXOS.org
//

export { Config } from '@dxos/config';

// TODO(burdon): Remove (create wrapper class).
export { generateSeedPhrase } from '@dxos/credentials';

export {
  TYPE_SCHEMA,
  Item,
  ResultSet,
  Schema,
  ShowDeletedOption,
  type QueryOptions,
  type SchemaDef,
  type SchemaField,
  type SchemaRef,
} from '@dxos/echo-db';

// TODO(burdon): Tighten export.
export * from '@dxos/echo-schema';
export * from '@dxos/client-protocol';

export { PublicKey } from '@dxos/keys';

// TODO(burdon): Export form `@dxos/echo-db`.
export { type ItemID, DocumentModel } from '@dxos/document-model';
export { TextModel } from '@dxos/text-model';
export { ApiError } from '@dxos/errors';

export {
  type Contact,
  type Identity,
  Invitation,
  SpaceMember,
  SpaceState,
  SystemStatus,
} from '@dxos/protocols/proto/dxos/client/services';
export type { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
export { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';

// TODO(burdon): Cherry-pick developer-facings APIs.
export * from './packlets/client';

export { Properties, PropertiesProps } from './packlets/proto';

// TODO(burdon): Remove (currently required for @dxos/client-testing).
export * from './packlets/proxies';

// TODO(burdon): Create separate export like testing?
export * from './packlets/devtools';
export * from './packlets/diagnostics';
