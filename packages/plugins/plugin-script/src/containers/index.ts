//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DeploymentDialog: ComponentType<any> = lazy(() => import('./DeploymentDialog/index.ts'));
export const NotebookArticle: ComponentType<any> = lazy(() => import('./NotebookArticle/index.ts'));
export const ScriptArticle: ComponentType<any> = lazy(() => import('./ScriptArticle/index.ts'));
export const ScriptProperties: ComponentType<any> = lazy(() => import('./ScriptProperties/index.ts'));
export const ScriptSettings: ComponentType<any> = lazy(() => import('./ScriptSettings/index.ts'));
export const TestContainer: ComponentType<any> = lazy(() => import('./TestContainer/index.ts'));
