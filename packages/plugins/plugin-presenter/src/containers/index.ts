//
// Copyright 2023 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const CollectionPresenterContainer: ComponentType<any> = lazy(() => import('./CollectionPresenterContainer'));
export const DocumentPresenterContainer: ComponentType<any> = lazy(() => import('./DocumentPresenterContainer'));
export const MarkdownSlide: ComponentType<any> = lazy(() => import('./MarkdownSlide'));
export const PresenterSettings: ComponentType<any> = lazy(() => import('./PresenterSettings'));
