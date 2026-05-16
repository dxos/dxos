//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelChat: ComponentType<any> = lazy(() => import('./ChannelChat'));
export const ChannelContainer: ComponentType<any> = lazy(() => import('./ChannelContainer'));
export const ThreadContainer: ComponentType<any> = lazy(() => import('./ThreadContainer'));
export const ThreadCompanion: ComponentType<any> = lazy(() => import('./ThreadCompanion'));
