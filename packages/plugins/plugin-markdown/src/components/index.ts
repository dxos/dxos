//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './MarkdownCard';
export * from './MarkdownContainer';
export * from './MarkdownSettings';

export const MarkdownCard = lazy(() => import('./MarkdownCard'));
export const MarkdownContainer = lazy(() => import('./MarkdownContainer'));
