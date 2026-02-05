//
// Copyright 2023 DXOS.org
//

import { type LazyExoticComponent, lazy } from 'react';

import { type MarkdownCard as MarkdownCardType } from './MarkdownCard';
import { type MarkdownContainer as MarkdownContainerType } from './MarkdownContainer';

export * from './MarkdownCard';
export * from './MarkdownContainer';
export * from './MarkdownSettings';

export const MarkdownCard: LazyExoticComponent<typeof MarkdownCardType> = lazy(() => import('./MarkdownCard'));
export const MarkdownContainer: LazyExoticComponent<typeof MarkdownContainerType> = lazy(
  () => import('./MarkdownContainer'),
);
