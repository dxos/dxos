//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const LoadPluginDialog: ComponentType<any> = lazy(() => import('./LoadPluginDialog/index.ts'));
export const PluginArticle: ComponentType<any> = lazy(() => import('./PluginArticle/index.ts'));
export const PublicRegistryArticle: ComponentType<any> = lazy(() => import('./PublicRegistryArticle/index.ts'));
export const RegistryArticle: ComponentType<any> = lazy(() => import('./RegistryArticle/index.ts'));
export const RegistrySettingsContainer: ComponentType<any> = lazy(() => import('./RegistrySettingsContainer/index.ts'));
