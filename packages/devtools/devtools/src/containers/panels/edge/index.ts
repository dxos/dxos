//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const EdgeDashboardArticle = lazy(() => import('./EdgeDashboardArticle/index.ts'));
export const InvocationTraceContainer = lazy(() =>
  import('./InvocationTraceArticle/InvocationTraceContainer.tsx').then((module) => ({
    default: module.InvocationTraceContainer,
  })),
);
export const InvocationTraceArticle = lazy(() => import('./InvocationTraceArticle/index.ts'));
export const TestingArticle = lazy(() => import('./TestingArticle/index.ts'));
export const WorkflowArticle = lazy(() => import('./WorkflowArticle/index.ts'));
