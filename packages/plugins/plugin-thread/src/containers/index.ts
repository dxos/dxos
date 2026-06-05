//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelChat: ComponentType<any> = lazy(() => import('./ChannelChat'));
export const ChannelCreatePanel: ComponentType<any> = lazy(() => import('./ChannelCreatePanel'));
export const ChannelArticle: ComponentType<any> = lazy(() => import('./ChannelArticle'));
export const ThreadContainer: ComponentType<any> = lazy(() => import('./ThreadContainer'));
