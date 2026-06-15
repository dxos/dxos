//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const KanbanArticle: ComponentType<any> = lazy(() => import('./KanbanArticle'));
export const KanbanSettings: ComponentType<any> = lazy(() => import('./KanbanSettings'));
