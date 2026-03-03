//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { SearchDialogProps } from './SearchDialog/SearchDialog';

export const SearchDialog: ComponentType<any> = lazy(() => import('./SearchDialog'));
export const SearchMain: ComponentType<any> = lazy(() => import('./SearchMain'));
export const SpaceMain: ComponentType<any> = lazy(() => import('./SpaceMain'));
