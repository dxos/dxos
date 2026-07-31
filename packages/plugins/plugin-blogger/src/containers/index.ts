//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const PublicationArticle: ComponentType<any> = lazy(() => import('./PublicationArticle'));
export const PostArticle: ComponentType<any> = lazy(() => import('./PostArticle'));
