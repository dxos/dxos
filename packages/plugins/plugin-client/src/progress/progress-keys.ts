//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { meta } from '#meta';

/** Stable progress-monitor key for automerge document replication in a space. */
export const createSpaceReplicationProgressKey = (spaceId: SpaceId): string =>
  `${meta.profile.key}:space:${spaceId}#replication`;

/** Stable progress-monitor key for ECHO feed block replication in a space. */
export const createSpaceFeedReplicationProgressKey = (spaceId: SpaceId): string =>
  `${meta.profile.key}:space:${spaceId}#feeds`;
