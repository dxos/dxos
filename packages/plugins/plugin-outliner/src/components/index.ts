//
// Copyright 2025 DXOS.org
//

import { lazy } from 'react';

export * from './JournalContainer';
export * from './OutlinerContainer';

export const JournalContainer = lazy(() => import('./JournalContainer'));
export const OutlinerContainer = lazy(() => import('./OutlinerContainer'));
