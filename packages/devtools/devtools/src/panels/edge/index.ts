//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export const EdgeDashboardPanel = lazy(() => import('./EdgeDashboardPanel'));
// TODO(wittjosiah): Refactor.
export const InvocationTraceContainer = lazy(() => import('./InvocationTracePanel/InvocationTraceContainer'));
export const InvocationTracePanel = lazy(() => import('./InvocationTracePanel'));
export const TestingPanel = lazy(() => import('./TestingPanel'));
export const WorkflowPanel = lazy(() => import('./WorkflowPanel'));
