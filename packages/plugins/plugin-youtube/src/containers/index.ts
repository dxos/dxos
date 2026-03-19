//
// Copyright 2024 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelArticle: ComponentType<any> = lazy(() => import('./ChannelArticle'));
export const ChannelSettings: ComponentType<any> = lazy(() => import('./ChannelSettings'));
export const VideoArticle: ComponentType<any> = lazy(() => import('./VideoArticle'));
export const VideoCard: ComponentType<any> = lazy(() => import('./VideoCard'));
