//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { LingoOperation } from '#types';

export const LingoOperationHandlerSet = OperationHandlerSet.lazy([
  LingoOperation.AddWord.pipe(Operation.lazyHandler(() => import('./add-word'))),
  LingoOperation.AnalyzeText.pipe(Operation.lazyHandler(() => import('./analyze-text'))),
  LingoOperation.ExtractVocabulary.pipe(Operation.lazyHandler(() => import('./extract-vocabulary'))),
  LingoOperation.RecordReview.pipe(Operation.lazyHandler(() => import('./record-review'))),
  LingoOperation.TranslatePassage.pipe(Operation.lazyHandler(() => import('./translate-passage'))),
  LingoOperation.TranslateTerm.pipe(Operation.lazyHandler(() => import('./translate-term'))),
]);
