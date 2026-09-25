//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';

import {
  EdgeSubductionReplicatorRegistrationSpec,
  EdgeSubductionReplicatorSpec,
  MeshReplicatorRegistrationSpec,
  MeshReplicatorSpec,
} from './bindings.ts';
import { CrossDeviceSpaceSynchronizerSpec } from './cross-device-space-synchronizer.ts';
import {
  DataServiceRegistrationSpec,
  DataServiceSpec,
  EchoHostSpec,
  FeedServiceRegistrationSpec,
  FeedServiceSpec,
  QueryServiceRegistrationSpec,
  QueryServiceSpec,
} from './echo-host.ts';
import { FeedSyncerSpec } from './feed-syncer.ts';
import { type Options } from './interface.ts';
import { SpaceManagerSpec } from './space/space-manager.ts';
import { DataSpaceManagerSpec, SigningContextProviderSpec } from './spaces/data-space-manager.ts';
import { SpacesServiceRegistrationSpec, SpacesServiceSpec } from './spaces/spaces-service.ts';

export * from './bindings.ts';
export * from './cross-device-space-synchronizer.ts';
export * from './echo-host.ts';
export * from './feed-syncer.ts';
export * from './interface.ts';

/**
 * The space stack, data spaces, replication and the services projected off the echo host.
 */
export const specs = (options: Options): LayerSpec.LayerSpec[] => [
  SpaceManagerSpec(options),
  SigningContextProviderSpec,
  EchoHostSpec({
    useSubduction: options.edgeFeatures?.subductionReplicator,
    queryExecutor: options.queryExecutor,
  }),
  DataSpaceManagerSpec(options),
  CrossDeviceSpaceSynchronizerSpec,

  ...(options.disableP2pReplication ? [] : [MeshReplicatorSpec, MeshReplicatorRegistrationSpec]),
  ...(options.subductionEnabled ? [EdgeSubductionReplicatorSpec, EdgeSubductionReplicatorRegistrationSpec] : []),
  FeedSyncerSpec,

  SpacesServiceSpec,
  SpacesServiceRegistrationSpec,
  DataServiceSpec,
  DataServiceRegistrationSpec,
  QueryServiceSpec,
  QueryServiceRegistrationSpec,
  FeedServiceSpec,
  FeedServiceRegistrationSpec,
];
