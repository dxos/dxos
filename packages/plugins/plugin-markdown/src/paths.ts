//
// Copyright 2025 DXOS.org
//

import { Paths } from '@dxos/app-toolkit';

import { Markdown } from '#types';

const { getSectionPath: getDocumentsPath, getObjectPath: getDocumentPath } = Paths.createTypeSectionPaths(
  Markdown.Document,
);

export { getDocumentsPath, getDocumentPath };
