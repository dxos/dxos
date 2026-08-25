//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { meta } from '#meta';

/** Stable progress-monitor key for a space's combined (documents + feed blocks) replication backlog. */
export const createSpaceReplicationProgressKey = (spaceId: SpaceId): string =>
  `${meta.profile.key}:space:${spaceId}#replication`;
