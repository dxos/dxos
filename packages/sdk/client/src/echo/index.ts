//
// Copyright 2023 DXOS.org
//

export { SpaceId } from '@dxos/keys';
export { isSpace, type Echo, type Space, SpaceSchema, SpaceProperties } from '@dxos/client-protocol';
// TODO(burdon): Remove re-exports.
export {
  createObject,
  createSubscription,
  // type EchoDatabase,
  type ObjectMigration,
  // ObjectVersion,
  Queue,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-db';
export { Filter, Query } from '@dxos/echo';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export { importSpace, type ImportSpaceOptions } from './import';
export {
  createEmptyEdgeSyncState,
  getSpace,
  getSyncSummary,
  type Progress,
  type PeerSyncState,
  type SpaceSyncStateMap,
} from './util';
