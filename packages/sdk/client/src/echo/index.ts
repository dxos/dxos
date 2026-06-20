//
// Copyright 2023 DXOS.org
//

// TODO(burdon): See AUDIT.md

export { isSpace, type Space, SpaceSchema, SpaceProperties } from '@dxos/client-protocol';
export {
  createObject,
  createSubscription,
  type ObjectMigration,
  type Selection,
  type SubscriptionHandle,
} from '@dxos/echo-client';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export { importSpace, type ImportSpaceOptions } from './import';
export { getSyncSummary, type PeerSyncState, type SpaceSyncStateMap } from './util';
export { getSpace } from './space-proxy';
