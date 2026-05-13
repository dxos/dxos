//
// Copyright 2023 DXOS.org
//

export { isSpace, type Echo, type Space, SpaceSchema, SpaceProperties } from '@dxos/client-protocol';
// TODO(burdon): Remove re-exports.
export {
  createObject,
  createSubscription,
  type ObjectMigration,
  Queue,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-db';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

// TODO(burdon): Reconcile under Hyperspace namespace (incl. client-protocol above).
export { importSpace, type ImportSpaceOptions } from './import';
export { getSpace, getSyncSummary, type Progress, type PeerSyncState, type SpaceSyncStateMap } from './util';
