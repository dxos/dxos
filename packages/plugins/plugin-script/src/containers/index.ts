//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DeploymentDialog: ComponentType<any> = lazy(() => import('./DeploymentDialog'));
export const NotebookArticle: ComponentType<any> = lazy(() => import('./NotebookArticle'));
export const ScriptArticle: ComponentType<any> = lazy(() => import('./ScriptArticle'));
export const ScriptProperties: ComponentType<any> = lazy(() => import('./ScriptProperties'));
export const TestContainer: ComponentType<any> = lazy(() => import('./TestContainer'));
