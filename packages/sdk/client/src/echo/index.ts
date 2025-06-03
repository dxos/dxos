//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { type Echo, type Space, type PropertiesType, type PropertiesTypeProps } from '@dxos/client-protocol';
export {
  compareForeignKeys,
  createQueueDxn,
  getMeta,
  getSchema,
  getType,
  getTypename,
  Expando,
  type ObjectMeta,
  Ref,
  RefArray,
  type TypedObject,
} from '@dxos/echo-schema';
export { type Live, live, isLiveObject, makeRef, refFromDXN } from '@dxos/live-object';
export {
  DocAccessor,
  type EchoDatabase,
  Query,
  Filter,
  type FilterSource,
  type Hypergraph,
  type IDocHandle,
  ObjectVersion,
  type ObjectMigration,
  type Queue,
  type QueryResult,
  type AnyLiveObject,
  ResultFormat,
  type Selection,
  type SubscriptionHandle,
  createDocAccessor,
  createObject,
  createSubscription,
  defineObjectMigration,
  fromCursor,
  hasType,
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
  fullyQualifiedId,
  FQ_ID_LENGTH,
  OBJECT_ID_LENGTH,
  SPACE_ID_LENGTH,
  EchoObjectSchema,
  ReactiveObjectSchema,
  SpaceSchema,
  getSpace,
  getSyncSummary,
  isSpace,
  parseFullyQualifiedId,
  parseId,
  type Progress,
  type PeerSyncState,
  type SpaceSyncStateMap,
} from './util';
export { importSpace } from './import';
