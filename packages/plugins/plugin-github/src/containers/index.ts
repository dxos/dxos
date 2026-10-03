//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const ImportPullRequestDialog: ComponentType<any> = lazy(() => import('./ImportPullRequestDialog/index.ts'));
export const PullRequestCardMenu: ComponentType<any> = lazy(() => import('./PullRequestCardMenu/index.ts'));
export const PullRequestArticle: ComponentType<any> = lazy(() => import('./PullRequestArticle/index.ts'));
export const WalkthroughArticle: ComponentType<any> = lazy(() => import('./WalkthroughArticle/index.ts'));
