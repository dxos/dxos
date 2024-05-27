//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, defaultKey, Properties, type PropertiesProps } from '@dxos/client-protocol';
export {
  getMeta,
  getSchema,
  getType,
  Expando,
  create,
  type EchoReactiveObject,
  type ReactiveObject,
  type ObjectMeta,
} from '@dxos/echo-schema';
export {
  createSubscription,
  createEchoObject,
  getRangeFromCursor,
  getTypeRef,
  getAutomergeObjectCore,
  hasType,
  Filter,
  Query,
  createDocAccessor,
  getTextInRange,
  fromCursor,
  toCursor,
  DocAccessor,
  isEchoObject,
  RuntimeSchemaRegistry,
  type IDocHandle,
  type EchoDatabase,
  type FilterSource,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
  type Hypergraph,
} from '@dxos/echo-db';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export { getSpace, isSpace, fullyQualifiedId } from './util';
