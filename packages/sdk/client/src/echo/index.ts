//
// Copyright 2023 DXOS.org
//

export { type Echo, type PropertiesType, type PropertiesTypeProps, type Space } from '@dxos/client-protocol';
export {
  createDocAccessor,
  createObject,
  createSubscription,
  defineObjectMigration,
  DocAccessor,
  Filter,
  fromCursor,
  getObjectCore,
  getRangeFromCursor,
  getTextInRange,
  hasType,
  isEchoObject,
  loadObjectReferences,
  ResultFormat,
  toCursor,
  toCursorRange,
  updateText,
  type EchoDatabase,
  type FilterSource,
  type Hypergraph,
  type IDocHandle,
  type ObjectMigration,
  type Query,
  type Queue,
  type ReactiveEchoObject,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-db';
export { Expando, getSchema, getTypename, type ObjectMeta, type TypedObject } from '@dxos/echo-schema';
export { SpaceId } from '@dxos/keys';
export {
  compareForeignKeys,
  getMeta,
  getType,
  isLiveObject,
  live,
  makeRef,
  RefArray,
  type Live,
} from '@dxos/live-object';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';

export { importSpace } from './import';
export {
  EchoObjectSchema,
  FQ_ID_LENGTH,
  fullyQualifiedId,
  getSpace,
  isSpace,
  OBJECT_ID_LENGTH,
  parseFullyQualifiedId,
  parseId,
  ReactiveObjectSchema,
  SPACE_ID_LENGTH,
  SpaceSchema,
} from './util';
