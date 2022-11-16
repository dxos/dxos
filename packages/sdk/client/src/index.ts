//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Remove (create wrapper class).
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

export { PublicKey } from '@dxos/keys';

// TODO(burdon): Export form `@dxos/echo-db`.
export { ItemID, ObjectModel, OrderedList } from '@dxos/object-model';

export {
  invitationObservable,
  InvitationEvents,
  InvitationEncoder,
  InvitationObservable,
  AuthenticatingInvitationObservable,
  // TODO(wittjosiah): Remove.
  ClientServicesHost,
  ClientServicesProvider,
  IFrameRuntime,
  WorkerRuntime,
  WorkerSession
} from '@dxos/client-services';

export { Contact, SpaceMember, Profile } from '@dxos/protocols/proto/dxos/client';
export { Invitation } from '@dxos/protocols/proto/dxos/client/services';

// TODO(burdon): Remove.
export { KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
export { SignRequest, SignResponse } from '@dxos/protocols/proto/dxos/client';

// TODO(burdon): Cherry-pick developer-facings APIs.
export * from './packlets/client';
export * from './packlets/devtools';
export * from './packlets/proxies';
export * from './packlets/testing';
