//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { MarkdownArticleProps } from './MarkdownArticle';

export const MarkdownCard: ComponentType<any> = lazy(() => import('./MarkdownCard'));
export const EditableMarkdownCard: ComponentType<any> = lazy(() => import('./EditableMarkdownCard'));
export const MarkdownArticle: ComponentType<any> = lazy(() => import('./MarkdownArticle'));
export const MarkdownSettings: ComponentType<any> = lazy(() => import('./MarkdownSettings'));
export const DiffView: ComponentType<any> = lazy(() => import('./DiffView'));
export const DocumentHistory: ComponentType<any> = lazy(() => import('./DocumentHistory'));
export const MarkdownProperties: ComponentType<any> = lazy(() => import('./MarkdownProperties'));
