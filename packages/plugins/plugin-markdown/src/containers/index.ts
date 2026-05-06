//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { MarkdownContainerProps } from './MarkdownContainer';

export const MarkdownCard: ComponentType<any> = lazy(() => import('./MarkdownCard'));
export const MarkdownEditableCard: ComponentType<any> = lazy(() =>
  import('./MarkdownCard').then((m) => ({ default: m.MarkdownEditableCard })),
);
export const MarkdownContainer: ComponentType<any> = lazy(() => import('./MarkdownContainer'));
