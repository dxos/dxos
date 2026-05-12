//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export { LOAD_PLUGIN_DIALOG } from './LoadPluginDialog/LoadPluginDialog';
export const LoadPluginDialog: ComponentType<any> = lazy(() => import('./LoadPluginDialog'));
export const PluginArticle: ComponentType<any> = lazy(() => import('./PluginArticle'));
export const PublicRegistryArticle: ComponentType<any> = lazy(() => import('./PublicRegistryArticle'));
export const RegistryArticle: ComponentType<any> = lazy(() => import('./RegistryArticle'));
export const RegistrySettingsContainer: ComponentType<any> = lazy(() => import('./RegistrySettingsContainer'));
