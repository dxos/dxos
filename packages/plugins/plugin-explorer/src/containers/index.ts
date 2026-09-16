//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ExplorerArticle: ComponentType<any> = lazy(() => import('./ExplorerArticle/index.ts'));
export const NeighborhoodCompanion: ComponentType<any> = lazy(() => import('./NeighborhoodCompanion/index.ts'));
