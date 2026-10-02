//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const RepositoryArticle: ComponentType<any> = lazy(() => import('./RepositoryArticle/index.ts'));
export const SandboxArticle: ComponentType<any> = lazy(() => import('./SandboxArticle/index.ts'));
