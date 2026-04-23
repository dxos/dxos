//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { SearchDialogProps } from './SearchDialog';

export const SearchDialog: ComponentType<any> = lazy(() => import('./SearchDialog'));
export const SearchArticle: ComponentType<any> = lazy(() => import('./SearchArticle'));
