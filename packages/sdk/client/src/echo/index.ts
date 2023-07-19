//
// Copyright 2023 DXOS.org
//

export type { Echo, Space } from '@dxos/client-protocol';
export { type ItemID, DocumentModel } from '@dxos/document-model';
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
export {
  createSubscription,
  EchoObject,
  EchoSchema,
  Expando,
  type Filter,
  Query,
  type Selection,
  type SubscriptionHandle,
  Text,
  type TypeFilter,
  TypedObject,
} from '@dxos/echo-schema';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextModel } from '@dxos/text-model';

export { Properties, type PropertiesProps } from '../proto';

export * from './echo-proxy';
export * from './serializer';
export * from './space-proxy';
export * from './util';
