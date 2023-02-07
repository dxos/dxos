//
// Copyright 2020 DXOS.org
//

export { Config } from '@dxos/config';

// TODO(burdon): Remove (create wrapper class).
export { generateSeedPhrase } from '@dxos/credentials';

export {
  TYPE_SCHEMA,
  Item,
  Database,
  Selection,
  SelectionResult,
  ItemFilterDeleted,
  ResultSet,
  Schema,
  type SchemaDef,
  type SchemaField,
  type SchemaRef
} from '@dxos/echo-db';

export { PublicKey } from '@dxos/keys';

// TODO(burdon): Export form `@dxos/echo-db`.
export { ItemID, DocumentModel, OrderedList } from '@dxos/document-model';

export {
  type InvitationEvents,
  InvitationEncoder,
  type CancellableInvitationObservable,
  type AuthenticatingInvitationObservable,
  // TODO(wittjosiah): Remove.
  ClientServicesHost,
  type ClientServicesProvider,
  IFrameHostRuntime,
  IFrameProxyRuntime,
  WorkerRuntime,
  WorkerSession
} from '@dxos/client-services';

export { ApiError } from '@dxos/errors';

export { Contact, Profile, SpaceMember, Status } from '@dxos/protocols/proto/dxos/client';
export { Invitation } from '@dxos/protocols/proto/dxos/client/services';

// TODO(burdon): Remove.
export { KeyRecord, KeyType } from '@dxos/protocols/proto/dxos/halo/keys';
export { SignRequest, SignResponse } from '@dxos/protocols/proto/dxos/client';

// TODO(burdon): Cherry-pick developer-facings APIs.
export * from './packlets/client';

// TODO(burdon): Remove (currently required for @dxos/client-testing).
export * from './packlets/proxies';

// TODO(burdon): Create separate export like testing?
export * from './packlets/devtools';
