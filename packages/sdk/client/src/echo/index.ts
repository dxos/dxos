//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
export { type ItemID, DocumentModel } from '@dxos/document-model';
// TODO(burdon): Remove/Rename Item.
export { Item } from '@dxos/echo-db';
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
  type EchoObject, // TODO(burdon): Remove?
  type FilterSource,
  type ObjectMeta,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
} from '@dxos/echo-schema';

export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { TextModel } from '@dxos/text-model';

export { SpaceList } from './space-list';
export { SpaceProxy } from './space-proxy';
export { createDefaultModelFactory, getSpaceForObject } from './util';
