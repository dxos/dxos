//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AgentActivity: ComponentType<any> = lazy(() => import('./AgentActivity/index.ts'));
export const ProfileProperties: ComponentType<any> = lazy(() => import('./ProfileProperties/index.ts'));
