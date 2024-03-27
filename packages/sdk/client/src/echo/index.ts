//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
// TODO(burdon): Remove/Rename Item.
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
  getTextInRange,
  fromCursor,
  toCursor,
  DocAccessor,
  type AutomergeTextCompat,
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

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export { SpaceList } from './space-list';
export { SpaceProxy } from './space-proxy'; // TODO(burdon): Don't export as part of API.
export { getSpaceForObject } from './util';
