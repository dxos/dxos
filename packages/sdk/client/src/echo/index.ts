//
// Copyright 2023 DXOS.org
//

export { type Echo, type Space, type PropertiesType, type PropertiesTypeProps } from '@dxos/client-protocol';
export {
  create,
  getMeta,
  getSchema,
  getType,
  getTypename,
  Expando,
  type EchoReactiveObject,
  type ReactiveObject,
  type ObjectMeta,
} from '@dxos/echo-schema';
export {
  createDocAccessor,
  createEchoObject,
  createSubscription,
  fromCursor,
  getRangeFromCursor,
  getObjectCore,
  getTextInRange,
  hasType,
  isEchoObject,
  toCursor,
  toCursorRange,
  DocAccessor,
  Filter,
  Query,
  RuntimeSchemaRegistry,
  loadObjectReferences,
  type IDocHandle,
  type EchoDatabase,
  type FilterSource,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
  type Hypergraph,
} from '@dxos/echo-db';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';

export { getSpace, isSpace, fullyQualifiedId } from './util';
