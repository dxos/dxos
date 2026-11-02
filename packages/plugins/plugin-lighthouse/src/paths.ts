//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { Research } from '#types';

/** A Research's URL key (`/research/<id>`). */
export const RESEARCH_KEY = 'research';

const { getSectionPath: getResearchSectionPath, getObjectPath: getResearchPath } = GraphPath.createTypeSectionPaths(
  Research.Research,
  { groupId: GraphPath.GroupSegments.ai },
);

export { getResearchPath, getResearchSectionPath };

/** Newest first, like lighthouse's session list: object ids are ULIDs, so they sort by creation time. */
export const newestFirst = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
