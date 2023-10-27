//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
export { type ItemID, DocumentModel } from '@dxos/document-model';
export { TYPE_SCHEMA, Item, type SchemaDef, type SchemaField, type SchemaRef } from '@dxos/echo-db';
export {
  base,
  createSubscription,
  isTypedObject,
  subscribe,
  EchoDatabase,
  Expando,
  Query,
  Schema,
  Text, // TODO(burdon): Deprecated.
  TextObject,
  TypeCollection,
  TypedObject,
  Filter,
  ShowDeletedOption,
  QUERY_ALL_MODELS,
  type EchoObject, // TODO(burdon): Remove?
  type FilterSource,
  type ObjectMeta,
  type QueryOptions,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
} from '@dxos/echo-schema';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { TextModel } from '@dxos/text-model';

export { SpaceList } from './space-list';
export { SpaceProxy } from './space-proxy';
export { createDefaultModelFactory, getSpaceForObject } from './util';
