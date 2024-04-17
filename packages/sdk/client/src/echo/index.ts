//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
export {
  base,
  debug,
  subscribe,
  createSubscription,
  hasType,
  Filter,
  Query,
  createDocAccessor,
  getTextInRange,
  fromCursor,
  toCursor,
  DocAccessor,
  getMeta,
  getSchema,
  getType,
  Expando,
  create,
  isEchoObject,
  RuntimeSchemaRegistry,
  type EchoReactiveObject,
  type ReactiveObject,
  type EchoDatabase,
  type EchoObject, // TODO(burdon): Remove from API.
  type FilterSource,
  type ObjectMeta,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
} from '@dxos/echo-schema';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export { getSpace, isSpace } from './util';
