//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { LOAD_PLUGIN_DIALOG } from './LoadPluginDialog/LoadPluginDialog';
export const LoadPluginDialog: ComponentType<any> = lazy(() => import('./LoadPluginDialog'));
export const PluginArticle: ComponentType<any> = lazy(() => import('./PluginArticle'));
export const PluginRegistry: ComponentType<any> = lazy(() => import('./PluginRegistry'));
