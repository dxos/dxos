//
// Copyright 2023 DXOS.org
//

// TODO(burdon): Reconcile under Hyperspace (incl. space proxy); namespace (incl. client-protocol above).

export { isSpace, type Echo, type Space, SpaceSchema, SpaceProperties } from '@dxos/client-protocol';
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

export { importSpace, type ImportSpaceOptions } from './import';
export { getSpace, getSyncSummary, type Progress, type PeerSyncState, type SpaceSyncStateMap } from './util';
