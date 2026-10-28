//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type TaskRowProps } from './TaskRow/TaskRow.tsx';

export const JournalArticle: ComponentType<any> = lazy(() => import('./JournalArticle/index.ts'));
export const OutlineCard: ComponentType<any> = lazy(() => import('./OutlineCard/index.ts'));
export const OutlineArticle: ComponentType<any> = lazy(() => import('./OutlineArticle/index.ts'));
export const RemoteSessionCard: ComponentType<any> = lazy(() => import('./RemoteSessionCard/index.ts'));
export const QuickEntryDialog: ComponentType<any> = lazy(() => import('./QuickEntryDialog/index.ts'));
export const TaskArticle: ComponentType<any> = lazy(() => import('./TaskArticle/index.ts'));
export const TaskRow: ComponentType<TaskRowProps> = lazy(() => import('./TaskRow/index.ts'));
export const TaskSetArticle: ComponentType<any> = lazy(() => import('./TaskSetArticle/index.ts'));
