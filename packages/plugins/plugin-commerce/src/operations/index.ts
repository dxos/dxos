//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SearchOperation from '../types/SearchOperation';

export const SearchOperationHandlerSet = OperationHandlerSet.keyed([
  [SearchOperation.RenderPage, () => import('./render-page')],
  [SearchOperation.RunSearch, () => import('./run-search')],
  [SearchOperation.RunProviderSearch, () => import('./run-provider-search')],
  [SearchOperation.AnalyzeProvider, () => import('./analyze-provider')],
  [SearchOperation.SetProviderTemplate, () => import('./set-provider-template')],
  [SearchOperation.GenerateProviderTemplate, () => import('./generate-provider-template')],
]);
