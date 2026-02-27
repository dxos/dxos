//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { MarkdownContainerProps } from './MarkdownContainer/MarkdownContainer';

export const MarkdownCard: ComponentType<any> = lazy(() => import('./MarkdownCard'));
export const MarkdownContainer: ComponentType<any> = lazy(() => import('./MarkdownContainer'));
export const MarkdownSettings: ComponentType<any> = lazy(() => import('./MarkdownSettings'));
