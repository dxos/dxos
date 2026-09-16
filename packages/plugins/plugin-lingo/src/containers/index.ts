//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const FlashcardsArticle: ComponentType<any> = lazy(() => import('./FlashcardsArticle/index.ts'));
export const ReaderArticle: ComponentType<any> = lazy(() => import('./ReaderArticle/index.ts'));
export const VocabularyArticle: ComponentType<any> = lazy(() => import('./VocabularyArticle/index.ts'));
