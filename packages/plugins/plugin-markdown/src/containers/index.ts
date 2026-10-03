//
// Copyright 2025 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export type { MarkdownArticleProps } from './MarkdownArticle/index.ts';

export const MarkdownCard: ComponentType<any> = lazy(() => import('./MarkdownCard/index.ts'));
export const EditableMarkdownCard: ComponentType<any> = lazy(() => import('./EditableMarkdownCard/index.ts'));
export const MarkdownArticle: ComponentType<any> = lazy(() => import('./MarkdownArticle/index.ts'));
export const MarkdownSettings: ComponentType<any> = lazy(() => import('./MarkdownSettings/index.ts'));
