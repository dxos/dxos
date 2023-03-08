//
// Copyright 2020 DXOS.org
//

export { Config } from '@dxos/config';

// TODO(burdon): Remove (create wrapper class).
export { generateSeedPhrase } from '@dxos/credentials';

export {
  TYPE_SCHEMA,
  Item,
  ItemFilterDeleted,
  ResultSet,
  Schema,
  type SchemaDef,
  type SchemaField,
  type SchemaRef
} from '@dxos/echo-db';

export * from '@dxos/echo-schema';

export { PublicKey } from '@dxos/keys';

// TODO(burdon): Export form `@dxos/echo-db`.
export { type ItemID, DocumentModel } from '@dxos/document-model';
export { ApiError } from '@dxos/errors';

export {
  type Contact,
  type Identity,
  Invitation,
  SpaceMember,
  SpaceStatus,
  SystemStatus
} from '@dxos/protocols/proto/dxos/client/services';
export { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';

// TODO(burdon): Cherry-pick developer-facings APIs.
export * from './packlets/client';

export { Properties, PropertiesProps } from './packlets/proto';

export * from './packlets/invitations';

// TODO(burdon): Remove (currently required for @dxos/client-testing).
export * from './packlets/proxies';

// TODO(burdon): Create separate export like testing?
export * from './packlets/devtools';
