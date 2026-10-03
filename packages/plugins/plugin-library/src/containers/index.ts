//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const BookArticle: ComponentType<any> = lazy(() => import('./BookArticle/index.ts'));
export const BookCard: ComponentType<any> = lazy(() => import('./BookCard/index.ts'));
export const BookNotesCompanion: ComponentType<any> = lazy(() => import('./BookNotesCompanion/index.ts'));
