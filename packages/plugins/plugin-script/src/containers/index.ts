//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DeploymentDialog: ComponentType<any> = lazy(() => import('./DeploymentDialog'));
export const NotebookContainer: ComponentType<any> = lazy(() => import('./NotebookContainer'));
export const ScriptContainer: ComponentType<any> = lazy(() => import('./ScriptContainer'));
export const ScriptObjectSettings: ComponentType<any> = lazy(() => import('./ScriptObjectSettings'));
export const ScriptPluginSettings: ComponentType<any> = lazy(() => import('./ScriptPluginSettings'));
export const ScriptProperties: ComponentType<any> = lazy(() => import('./ScriptProperties'));
export const TestContainer: ComponentType<any> = lazy(() => import('./TestContainer'));
