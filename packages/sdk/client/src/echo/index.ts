//
// Copyright 2023 DXOS.org
//

// TODO(burdon): See AUDIT.md

export { type Space, SpaceProperties, SpaceSchema, isSpace } from '@dxos/client-protocol';
export {
  type ObjectMigration,
  type Selection,
  type SubscriptionHandle,
  createObject,
  createSubscription,
} from '@dxos/echo-client';

export { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
export { SpaceMember, SpaceState } from '@dxos/protocols/proto/dxos/client/services';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
export { type SpaceSyncState } from '@dxos/protocols/proto/dxos/echo/service';

export { type ImportSpaceOptions, importSpace } from './import';
export { type PeerSyncState, type SpaceSyncStateMap, getSyncSummary } from './util';
export { getSpace } from './space-proxy';
