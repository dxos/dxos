//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CollectionArticle: ComponentType<any> = lazy(() => import('./CollectionArticle'));
export const DocumentArticle: ComponentType<any> = lazy(() => import('./DocumentArticle'));
export const SlideArticle: ComponentType<any> = lazy(() => import('./SlideArticle'));
