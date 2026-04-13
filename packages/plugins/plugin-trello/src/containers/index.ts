//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TrelloArticle: ComponentType<any> = lazy(() => import('./TrelloArticle'));
export const TrelloCardArticle: ComponentType<any> = lazy(() => import('./TrelloCardArticle'));
