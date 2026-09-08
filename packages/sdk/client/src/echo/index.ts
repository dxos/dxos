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

export { IndexKind } from '@dxos/protocols/buf/dxos/echo/indexing_pb';
export { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
export { SpaceMember } from '@dxos/protocols/buf/dxos/client/services_pb';
export { SpaceMember as HaloSpaceMember } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
export { type SpaceSyncState } from '@dxos/echo-client';

export { type ImportSpaceOptions, importSpace } from './import';
export { type PeerSyncState, type SpaceSyncStateMap, getSyncSummary } from './util';
export { getSpace } from './space-proxy';
