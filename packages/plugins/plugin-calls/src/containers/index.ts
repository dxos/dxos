//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CallArticle: ComponentType<any> = lazy(() => import('./CallArticle'));
export const CallDebugPanel: ComponentType<any> = lazy(() => import('./CallDebugPanel'));
export const CallSidebar: ComponentType<any> = lazy(() => import('./CallSidebar'));
export const CallsList: ComponentType<any> = lazy(() => import('./CallsList'));
