//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { Book } from '#types';

const { getSectionPath: getBooksPath, getObjectPath: getBookPath } = GraphPath.createTypeSectionPaths(Book.Book, {
  groupId: GraphPath.GroupSegments.content,
});

export { getBookPath, getBooksPath };
