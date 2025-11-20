//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export {
  type Echo,
  type Space,
  SpaceSchema,
  isSpace,
  PropertiesType,
  type PropertiesTypeProps,
} from '@dxos/client-protocol';
export {
  compareForeignKeys,
  createQueueDXN,
  getMeta,
  getSchema,
  getType,
  getTypename,
  Expando,
  type ObjectMeta,
  Ref,
  RefArray,
  type TypedObject,
} from '@dxos/echo/internal';
export { type Live, live, isLiveObject } from '@dxos/live-object';
export {
  DocAccessor,
  type EchoDatabase,
  Query,
  type Queryable,
  Filter,
  type Hypergraph,
  type IDocHandle,
  ObjectVersion,
  type ObjectMigration,
  Queue,
  type QueryResult,
  type AnyLiveObject,
  type Selection,
  type SubscriptionHandle,
  createDocAccessor,
  createObject,
  createSubscription,
  defineObjectMigration,
  fromCursor,
  isEchoObject,
  getObjectCore,
  getRangeFromCursor,
  getSource,
  getTarget,
  getTextInRange,
  getVersion,
  loadObjectReferences,
  toCursor,
  toCursorRange,
  updateText,
  isRelation,
} from '@dxos/echo-db';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export {
  createEmptyEdgeSyncState,
  FQ_ID_LENGTH,
  OBJECT_ID_LENGTH,
  SPACE_ID_LENGTH,
  EchoObjectSchema,
  ReactiveObjectSchema,
  getSpace,
  getSyncSummary,
  parseId,
  type Progress,
  type PeerSyncState,
  type SpaceSyncStateMap,
} from './util';
export { importSpace } from './import';
