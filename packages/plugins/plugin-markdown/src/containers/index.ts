//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { MarkdownContainerProps } from './MarkdownContainer';

export const MarkdownCard: ComponentType<any> = lazy(() => import('./MarkdownCard'));
export const EditableMarkdownCard: ComponentType<any> = lazy(() => import('./EditableMarkdownCard'));
export const MarkdownContainer: ComponentType<any> = lazy(() => import('./MarkdownContainer'));
