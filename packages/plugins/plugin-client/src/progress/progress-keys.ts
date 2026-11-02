//
// Copyright 2026 DXOS.org
//

import { type SpaceId } from '@dxos/keys';

import { ClientNamespace } from '../namespace.ts';

/** Stable progress-monitor key for a space's combined (documents + feed blocks) replication backlog. */
export const createSpaceReplicationProgressKey = (spaceId: SpaceId): string =>
  `${ClientNamespace.key}:space:${spaceId}#replication`;
