//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { ARTIFACTS_SEGMENT, STUDIO_SEGMENT } from './constants';

/** Canonical qualified path to the Studio section of a space. */
const getStudioPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.content, STUDIO_SEGMENT);

/** Canonical qualified path to the virtual "Artifacts" node under a space's Studio section. */
export const getArtifactsPath = (spaceId: string): string => `${getStudioPath(spaceId)}/${ARTIFACTS_SEGMENT}`;

/**
 * Where the nav tree shows an artifact: a child of the virtual "Artifacts" node, whose url binding
 * ends in the studio segment rather than a typename, so the generic type-section lookup cannot
 * derive it.
 */
export const getArtifactPath = (spaceId: string, objectId: string): string =>
  `${getArtifactsPath(spaceId)}/${objectId}`;
