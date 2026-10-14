//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { Book } from '#types';

/** The Library section's URL key, which also names its node. */
export const LIBRARY_KEY = 'library';

const { getSectionPath: getBooksPath, getObjectPath: getBookPath } = GraphPath.createTypeSectionPaths(Book.Book, {
  groupId: GraphPath.GroupSegments.content,
  sectionUrlKey: LIBRARY_KEY,
});

export { getBookPath, getBooksPath };
