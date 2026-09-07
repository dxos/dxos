//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TestPlanArticle: ComponentType<any> = lazy(() => import('./TestPlanArticle/TestPlanArticle'));
export const TestRunArticle: ComponentType<any> = lazy(() => import('./TestRunArticle/TestRunArticle'));
