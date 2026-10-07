//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const AgentActivity: ComponentType<any> = lazy(() => import('./AgentActivity/index.ts'));
export const AgentKnowledge: ComponentType<any> = lazy(() => import('./AgentKnowledge/index.ts'));
export const AgentPrivateChat: ComponentType<any> = lazy(() => import('./AgentPrivateChat/index.ts'));
export const ProfileProperties: ComponentType<any> = lazy(() => import('./ProfileProperties/index.ts'));
