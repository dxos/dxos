//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CallDebugPanel: ComponentType<any> = lazy(() => import('./CallDebugPanel'));
export const CallSidebar: ComponentType<any> = lazy(() => import('./CallSidebar'));
export const ChannelContainer: ComponentType<any> = lazy(() => import('./ChannelContainer'));
export const ThreadContainer: ComponentType<any> = lazy(() => import('./ThreadContainer'));
export const ThreadCompanion: ComponentType<any> = lazy(() => import('./ThreadCompanion'));
