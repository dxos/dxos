//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SearchOperation from '../types/SearchOperation';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy([
  SearchOperation.RenderPage.pipe(Operation.lazyHandler(() => import('./render-page'))),
  SearchOperation.RunSearch.pipe(Operation.lazyHandler(() => import('./run-search'))),
  SearchOperation.RunProviderSearch.pipe(Operation.lazyHandler(() => import('./run-provider-search'))),
  SearchOperation.AnalyzeProvider.pipe(Operation.lazyHandler(() => import('./analyze-provider'))),
  SearchOperation.SetProviderTemplate.pipe(Operation.lazyHandler(() => import('./set-provider-template'))),
  SearchOperation.GenerateProviderTemplate.pipe(Operation.lazyHandler(() => import('./generate-provider-template'))),
]);
