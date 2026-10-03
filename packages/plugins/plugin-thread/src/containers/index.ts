//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ChannelCreatePanel: ComponentType<any> = lazy(() => import('./ChannelCreatePanel/index.ts'));
export const ChannelArticle: ComponentType<any> = lazy(() => import('./ChannelArticle/index.ts'));
export const ThreadArticle: ComponentType<any> = lazy(() => import('./ThreadArticle/index.ts'));
