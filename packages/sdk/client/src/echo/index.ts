//
// Copyright 2023 DXOS.org
//

import { SpaceProxy } from './space-proxy';

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
  EchoDatabase,
  Expando,
  Filter,
  Query,
  Schema,
  Text, // TODO(burdon): Deprecated.
  TypeCollection,
  TextObject,
  TypedObject,
  getRawDoc,
  isAutomergeObject,
  isDocAccessor,
  getTextContent,
  setTextContent,
  getTextInRange,
  fromCursor,
  toCursor,
  type AutomergeTextCompat,
  type DocAccessor,
  type EchoObject, // TODO(burdon): Remove from API?
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
export { SpaceProxy } from './space-proxy'; // TODO(burdon): Don't export as part of API.
export { createDefaultModelFactory, getSpaceForObject } from './util';

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[SpaceProxy.name] = SpaceProxy;
