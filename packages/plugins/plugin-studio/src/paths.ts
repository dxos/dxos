//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';

import { ARTIFACTS_SEGMENT, STUDIO_SEGMENT } from './constants';

/** Canonical qualified path to the Studio section of a space. */
const getStudioPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.content, STUDIO_SEGMENT);

/**
 * Canonical qualified path to the virtual "Artifacts" node under a space's Studio section. Artifacts
 * are children of this node, so it is the create target that lands navigation in the Studio section
 * rather than the database subtree.
 */
export const getArtifactsPath = (spaceId: string): string => `${getStudioPath(spaceId)}/${ARTIFACTS_SEGMENT}`;
