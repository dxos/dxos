//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CollectionArticle: ComponentType<any> = lazy(() => import('./CollectionArticle/index.ts'));
export const DocumentArticle: ComponentType<any> = lazy(() => import('./DocumentArticle/index.ts'));
export const SlideArticle: ComponentType<any> = lazy(() => import('./SlideArticle/index.ts'));
