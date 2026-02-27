//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PluginArticle: ComponentType<any> = lazy(() => import('./PluginArticle'));
export const PluginRegistry: ComponentType<any> = lazy(() => import('./PluginRegistry'));
