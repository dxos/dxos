//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { isSpace, type Echo, type Space, SpaceSchema, SpaceProperties, LegacySpaceProperties } from '@dxos/client-protocol';
export { compareForeignKeys, createQueueDXN, type ObjectMeta, Ref, RefArray } from '@dxos/echo/internal';
export { Entity, Relation, Type, Database } from '@dxos/echo';
export {
  createObject,
  createSubscription,
  defineObjectMigration,
  getVersion,
  type EchoDatabase,
  type ObjectMigration,
  ObjectVersion,
  Queue,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-db';
export { Filter, Query } from '@dxos/echo';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export { importSpace } from './import';
export {
  createEmptyEdgeSyncState,
  parseId,
  getSpace,
  getSyncSummary,
  FQ_ID_LENGTH,
  OBJECT_ID_LENGTH,
  SPACE_ID_LENGTH,
  type Progress,
  type PeerSyncState,
  type SpaceSyncStateMap,
} from './util';
