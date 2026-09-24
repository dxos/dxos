//
// Copyright 2026 DXOS.org
//

import { type ComponentType, lazy } from 'react';

export const TestPlanArticle: ComponentType<any> = lazy(() => import('./TestPlanArticle/TestPlanArticle.tsx'));
export const TestRunArticle: ComponentType<any> = lazy(() => import('./TestRunArticle/TestRunArticle.tsx'));
