//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CollectionPresenterArticle: ComponentType<any> = lazy(() => import('./CollectionPresenterArticle'));
export const DocumentPresenterContainer: ComponentType<any> = lazy(() => import('./DocumentPresenterContainer'));
export const MarkdownSlide: ComponentType<any> = lazy(() => import('./MarkdownSlide'));
