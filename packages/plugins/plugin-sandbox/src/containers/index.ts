//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

import { type SandboxArticleProps } from './SandboxArticle/SandboxArticle.tsx';

export const RepositoryArticle: ComponentType<any> = lazy(() => import('./RepositoryArticle/index.ts'));
export const SandboxArticle: ComponentType<SandboxArticleProps> = lazy(() => import('./SandboxArticle/index.ts'));
