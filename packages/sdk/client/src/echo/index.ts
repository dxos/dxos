//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
// TODO(burdon): Export form `@dxos/echo-db`.
export { type ItemID, DocumentModel } from '@dxos/document-model';
export {
  TYPE_SCHEMA,
  Item,
  ShowDeletedOption,
  type QueryOptions,
  type SchemaDef,
  type SchemaField,
  type SchemaRef,
} from '@dxos/echo-db';
export {
  createSubscription,
  isTypedObject,
  base,
  subscribe,
  EchoDatabase,
  EchoObject,
  type ObjectMeta,
  EchoSchema,
  Expando,
  Query,
  Text,
  TypedObject,
  type Filter,
  type Selection,
  type SubscriptionHandle,
  type TypeFilter,
  Schema,
} from '@dxos/echo-schema';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { TextModel } from '@dxos/text-model';

export { SpaceList } from './space-list';
export { SpaceProxy } from './space-proxy';
export { createDefaultModelFactory } from './util';
