//
// Copyright 2025 DXOS.org
//

import { createTypeSectionPaths } from '@dxos/app-toolkit';

import { Markdown } from '#types';

const { getSectionPath: getDocumentsPath, getObjectPath: getDocumentPath } = createTypeSectionPaths(Markdown.Document);

export { getDocumentsPath, getDocumentPath };
