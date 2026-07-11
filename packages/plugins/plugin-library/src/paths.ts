//
// Copyright 2026 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Book } from '#types';

const { getSectionPath: getBooksPath, getObjectPath: getBookPath } = Paths.createTypeSectionPaths(Book.Book, {
  groupId: Paths.GroupSegments.content,
});

export { getBookPath, getBooksPath };
