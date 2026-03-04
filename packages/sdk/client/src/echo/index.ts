//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { isSpace, type Echo, type Space, SpaceSchema, SpaceProperties } from '@dxos/client-protocol';
export { compareForeignKeys, createQueueDXN, type ObjectMeta, Ref, RefArray } from '@dxos/echo/internal';
export { Entity, Relation, Type, Database } from '@dxos/echo';
export {
  createObject,
  createSubscription,
  getVersion,
  type EchoDatabase,
  Filter,
  type ObjectMigration,
  ObjectVersion,
  Query,
  Queue,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-db';

// TODO(dmaretskyi): Remove this export.
export { decodeReference as internalDecodeReference } from '@dxos/echo-protocol';

export { type IndexKind } from '@dxos/protocols/buf/dxos/echo/indexing_pb';
export {
  type QueryOptions,
  QueryOptions_DataLocation,
  QueryOptions_ShowDeletedOption,
} from '@dxos/protocols/buf/dxos/echo/filter_pb';
export { type SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
export { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
export {
  SpaceMember_Role as HaloSpaceMember_Role,
  SpaceMember_Role,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
export { TextKind } from '@dxos/protocols/buf/dxos/echo/model/text_pb';
export { type SpaceSyncState } from '@dxos/protocols/buf/dxos/echo/service_pb';

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
