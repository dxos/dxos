//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { type Echo, type Space, type PropertiesType, type PropertiesTypeProps } from '@dxos/client-protocol';
export {
  create,
  getMeta,
  getSchema,
  getType,
  getTypename,
  isReactiveObject,
  Expando,
  type ObjectMeta,
  type ReactiveObject,
} from '@dxos/echo-schema';
export {
  createDocAccessor,
  createEchoObject,
  createSubscription,
  fromCursor,
  getObjectCore,
  getRangeFromCursor,
  getTextInRange,
  hasType,
  isEchoObject,
  loadObjectReferences,
  toCursor,
  toCursorRange,
  DocAccessor,
  type EchoDatabase,
  type EchoReactiveObject,
  Filter,
  type FilterSource,
  type Hypergraph,
  type IDocHandle,
  Query,
  type Selection,
  type Subscription,
  type SubscriptionHandle,
} from '@dxos/echo-db';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export { getSpace, isSpace, fullyQualifiedId, parseFullyQualifiedId } from './util';
