//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CallDebugPanel: ComponentType<any> = lazy(() => import('./CallDebugPanel'));
export const CallSidebar: ComponentType<any> = lazy(() => import('./CallSidebar'));
