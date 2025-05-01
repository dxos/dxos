//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { type Echo, type Space, type PropertiesType, type PropertiesTypeProps } from '@dxos/client-protocol';
export { getTypename, Expando, type TypedObject, type ObjectMeta, getSchema } from '@dxos/echo-schema';
export {
  type Live,
  RefArray,
  live,
  getMeta,
  getType,
  isLiveObject,
  compareForeignKeys,
  makeRef,
} from '@dxos/live-object';
export {
  DocAccessor,
  type EchoDatabase,
  Filter,
  type FilterSource,
  type Hypergraph,
  type IDocHandle,
  type ObjectMigration,
  type Queue,
  type Query,
  type ReactiveEchoObject,
  ResultFormat,
  type Selection,
  type SubscriptionHandle,
  createDocAccessor,
  createObject,
  createSubscription,
  defineObjectMigration,
  fromCursor,
  getObjectCore,
  getRangeFromCursor,
  getTextInRange,
  hasType,
  isEchoObject,
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
  FQ_ID_LENGTH,
  OBJECT_ID_LENGTH,
  SPACE_ID_LENGTH,
  EchoObjectSchema,
  ReactiveObjectSchema,
  SpaceSchema,
  getSpace,
  isSpace,
  fullyQualifiedId,
  parseFullyQualifiedId,
  parseId,
  randomQueueDxn,
} from './util';
export { importSpace } from './import';
