//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './PresenterSettings';

export const MarkdownSlide = lazy(() => import('./MarkdownSlide'));
export const RevealMain = lazy(() => import('./RevealMain'));
export const PresenterMain = lazy(() => import('./PresenterMain'));
