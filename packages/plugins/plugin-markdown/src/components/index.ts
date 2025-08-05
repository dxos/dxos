//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './MarkdownSettings';

export const MarkdownContainer = lazy(() => import('./MarkdownContainer'));
export const MarkdownCard = lazy(() => import('./MarkdownCard'));
