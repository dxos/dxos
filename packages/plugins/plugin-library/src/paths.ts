//
// Copyright 2026 DXOS.org
//

import { GraphPath } from '@dxos/app-toolkit';

import { Book } from '#types';

const { getSectionPath: getBooksPath, getObjectPath: getBookPath } = GraphPath.createTypeSectionPaths(Book.Book, {
  groupId: GraphPath.GroupSegments.content,
});

export { getBookPath, getBooksPath };
