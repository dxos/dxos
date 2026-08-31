//
// Copyright 2026 DXOS.org
//

import * as GraphPath from '@dxos/app-toolkit/GraphPath';

import { Language, Vocabulary } from '#types';

const { getSectionPath: getLanguagesPath, getObjectPath: getLanguagePath } = GraphPath.createTypeSectionPaths(
  Language.Language,
  { groupId: GraphPath.GroupSegments.content },
);

const { getSectionPath: getVocabulariesPath, getObjectPath: getVocabularyPath } = GraphPath.createTypeSectionPaths(
  Vocabulary.Vocabulary,
  { groupId: GraphPath.GroupSegments.content },
);

export { getLanguagePath, getLanguagesPath, getVocabulariesPath, getVocabularyPath };
