//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelCompanion: ComponentType<any> = lazy(() => import('./ChannelCompanion'));
export const ChannelCreatePanel: ComponentType<any> = lazy(() => import('./ChannelCreatePanel'));
export const ChannelArticle: ComponentType<any> = lazy(() => import('./ChannelArticle'));
export const ThreadArticle: ComponentType<any> = lazy(() => import('./ThreadArticle'));
