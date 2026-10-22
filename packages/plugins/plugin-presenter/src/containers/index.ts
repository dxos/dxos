//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const DocumentArticle: ComponentType<any> = lazy(() => import('./DocumentArticle/index.ts'));
export const PresentationArticle: ComponentType<any> = lazy(() => import('./PresentationArticle/index.ts'));
export const SlideArticle: ComponentType<any> = lazy(() => import('./SlideArticle/index.ts'));
export const SlideEditorArticle: ComponentType<any> = lazy(() => import('./SlideEditorArticle/index.ts'));
