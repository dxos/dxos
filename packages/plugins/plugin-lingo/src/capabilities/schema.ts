//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Analysis, Language, Vocabulary, Word } from '#types';

export const Schema = AppCapability.schema([Analysis.Analysis, Language.Language, Vocabulary.Vocabulary, Word.Word]);
