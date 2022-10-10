//
// Copyright 2020 DXOS.org
//

export { generateSeedPhrase } from '@dxos/credentials';

export {
  TYPE_SCHEMA,
  Entity,
  Item,
  Link,
  Database,
  Selection,
  SelectionResult,
  ItemFilterDeleted,
  ResultSet,
  Schema,
  SchemaDef,
  SchemaField,
  SchemaRef
} from '@dxos/echo-db';

export {
  clientServiceBundle,
  InvitationDescriptor
} from '@dxos/client-services';

export {
  PublicKey
} from '@dxos/keys';

export {
  type ItemID
} from '@dxos/protocols';

// TODO(burdon): Remove exported protos?
export {
  type KeyRecord,
  KeyType
} from '@dxos/protocols/proto/dxos/halo/keys';

export {
  type Profile,
  type SignRequest,
  type SignResponse
} from '@dxos/protocols/proto/dxos/client';

export {
  ObjectModel,
  OrderedList
} from '@dxos/object-model';

// TODO(wittjosiah): Remove.
export {
  NetworkManager,
  createWebRTCTransportFactory
} from '@dxos/network-manager';

export * from './packlets/api/index.js';
export * from './packlets/proxies/index.js';
// export * from './packlets/devtools';
