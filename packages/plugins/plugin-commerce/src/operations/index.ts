//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SearchOperation } from '../types';

export const SearchOperationHandlerSet = OperationHandlerSet.keyed([
  [SearchOperation.RenderPage, () => import('./render-page')],
  [SearchOperation.RunSearch, () => import('./run-search')],
  [SearchOperation.RunProviderSearch, () => import('./run-provider-search')],
  [SearchOperation.AnalyzeProvider, () => import('./analyze-provider')],
  [SearchOperation.SetProviderTemplate, () => import('./set-provider-template')],
  [SearchOperation.GenerateProviderTemplate, () => import('./generate-provider-template')],
]);
