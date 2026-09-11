//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SearchOperation } from '#types';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy([
  SearchOperation.RenderPage.pipe(Operation.lazyHandler(() => import('./render-page.ts'))),
  SearchOperation.RunSearch.pipe(Operation.lazyHandler(() => import('./run-search.ts'))),
  SearchOperation.RunProviderSearch.pipe(Operation.lazyHandler(() => import('./run-provider-search.ts'))),
  SearchOperation.AnalyzeProvider.pipe(Operation.lazyHandler(() => import('./analyze-provider.ts'))),
  SearchOperation.SetProviderTemplate.pipe(Operation.lazyHandler(() => import('./set-provider-template.ts'))),
  SearchOperation.GenerateProviderTemplate.pipe(Operation.lazyHandler(() => import('./generate-provider-template.ts'))),
]);
