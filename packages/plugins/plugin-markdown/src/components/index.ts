//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './MarkdownSettings';

export const MarkdownContainer = lazy(() => import('./MarkdownContainer'));
export const MarkdownPreview = lazy(() => import('./MarkdownPreview'));
