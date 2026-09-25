//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CallArticle: ComponentType<any> = lazy(() => import('./CallArticle/index.ts'));
export const CallDebugPanel: ComponentType<any> = lazy(() => import('./CallDebugPanel/index.ts'));
export const CallSidebar: ComponentType<any> = lazy(() => import('./CallSidebar/index.ts'));
