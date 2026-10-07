//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { LingoOperation } from '#types';

export const LingoOperationHandlerSet = OperationHandlerSet.lazy([
  LingoOperation.AddWord.pipe(Operation.lazyHandler(() => import('./add-word.ts'))),
  LingoOperation.AnalyzeText.pipe(Operation.lazyHandler(() => import('./analyze-text.ts'))),
  LingoOperation.ExtractVocabulary.pipe(Operation.lazyHandler(() => import('./extract-vocabulary.ts'))),
  LingoOperation.RecordReview.pipe(Operation.lazyHandler(() => import('./record-review.ts'))),
  LingoOperation.TranslatePassage.pipe(Operation.lazyHandler(() => import('./translate-passage.ts'))),
  LingoOperation.TranslateTerm.pipe(Operation.lazyHandler(() => import('./translate-term.ts'))),
]);
