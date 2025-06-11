//
// Copyright 2023 DXOS.org
//

import { lazy } from 'react';

export * from './Outliner';

export const JournalContainer = lazy(() => import('./JournalContainer'));
export const OutlinerContainer = lazy(() => import('./OutlinerContainer'));
