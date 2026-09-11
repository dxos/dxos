//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const VoxelArticle: ComponentType<any> = lazy(() => import('./VoxelArticle/index.ts'));
export const VoxelCard: ComponentType<any> = lazy(() => import('./VoxelCard/index.ts'));
