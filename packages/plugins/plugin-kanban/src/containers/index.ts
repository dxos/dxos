//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const KanbanContainer: ComponentType<any> = lazy(() => import('./KanbanContainer'));
export const KanbanViewEditor: ComponentType<any> = lazy(() => import('./KanbanViewEditor'));
