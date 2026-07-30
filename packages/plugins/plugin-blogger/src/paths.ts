//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';

/** Well-known local segment name (private — use the helpers below). */
const PUBLICATIONS_SEGMENT = 'publications';

/** Canonical segment ID for the Publications section node. */
export const getPublicationsSectionId = (): string => PUBLICATIONS_SEGMENT;

/**
 * Canonical qualified path to the Publications section of a space. Publications are children of this
 * node, so it is the create target that lands navigation in the Publications section rather than the
 * database subtree.
 */
export const getPublicationsPath = (spaceId: string): string =>
  GraphPath.getSpacePath(spaceId, GraphPath.GroupSegments.content, PUBLICATIONS_SEGMENT);
