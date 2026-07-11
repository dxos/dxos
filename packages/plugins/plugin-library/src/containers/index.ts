//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const BookArticle: ComponentType<any> = lazy(() => import('./BookArticle'));
export const BookCard: ComponentType<any> = lazy(() => import('./BookCard'));
