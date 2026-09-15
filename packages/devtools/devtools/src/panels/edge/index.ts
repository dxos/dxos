//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const EdgeDashboardPanel = lazy(() => import('./EdgeDashboardPanel/index.ts'));
// TODO(wittjosiah): Refactor.
export const InvocationTraceContainer = lazy(() => import('./InvocationTracePanel/index.ts'));
export const InvocationTracePanel = lazy(() => import('./InvocationTracePanel/index.ts'));
export const TestingPanel = lazy(() => import('./TestingPanel/index.ts'));
export const WorkflowPanel = lazy(() => import('./WorkflowPanel/index.ts'));
