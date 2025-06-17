//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './PresenterSettings';

export const MarkdownSlide = lazy(() => import('./MarkdownSlide'));
export const DocumentPresenterContainer = lazy(() => import('./DocumentPresenterContainer'));
export const CollectionPresenterContainer = lazy(() => import('./CollectionPresenterContainer'));
