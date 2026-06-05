//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelArticle: ComponentType<any> = lazy(() => import('./ChannelArticle'));
export const ThreadContainer: ComponentType<any> = lazy(() => import('./ThreadContainer'));
export const CommentsCompanion: ComponentType<any> = lazy(() => import('./CommentsCompanion'));
