//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CallDebugPanel: ComponentType<any> = lazy(() => import('./CallDebugPanel'));
export const CallSidebar: ComponentType<any> = lazy(() => import('./CallSidebar'));
export const ChannelContainer: ComponentType<any> = lazy(() => import('./ChannelContainer'));
export const ChatContainer: ComponentType<any> = lazy(() => import('./ChatContainer'));
export const ThreadCompanion: ComponentType<any> = lazy(() => import('./ThreadCompanion'));
export const ThreadSettings: ComponentType<any> = lazy(() => import('./ThreadSettings'));
