//
// Copyright 2025 DXOS.org
//

import { lazy } from 'react';

export * from './Journal';
export * from './Outline';

export const JournalContainer = lazy(() => import('./JournalContainer'));
export const OutlineContainer = lazy(() => import('./OutlineContainer'));
