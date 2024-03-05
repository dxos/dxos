//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
export { type ItemID, DocumentModel } from '@dxos/document-model';
// TODO(burdon): Remove/Rename Item.
export { Item } from '@dxos/echo-db';
export {
  base,
  debug,
  subscribe,
  createSubscription,
  hasType,
  isTypedObject,
  Expando,
  Filter,
  Query,
  Schema,
  TypedObject,
  getRawDoc,
  isDocAccessor,
  getTextInRange,
  fromCursor,
  toCursor,
  type AutomergeTextCompat,
  type DocAccessor,
  type EchoDatabase,
  type EchoObject, // TODO(burdon): Remove from API.
  type FilterSource,
  type ObjectMeta,
  type Selection,
  type Subscription,
  type SubscriptionHandle,

  // TODO(burdon): Deprecated.
  createDocAccessor,
  isAutomergeObject,
  getTextContent,
  setTextContent,
  Text,
  TextObject,
  TypeCollection,
} from '@dxos/echo-schema';

export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { TextModel } from '@dxos/text-model';

export { SpaceList } from './space-list';
export { SpaceProxy } from './space-proxy'; // TODO(burdon): Don't export as part of API.
export { createDefaultModelFactory, getSpaceForObject } from './util';
