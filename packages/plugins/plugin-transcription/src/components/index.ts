//
// Copyright 2025 DXOS.org
//

import { lazy } from 'react';

export * from './Transcript';
export * from './TranscriptContainer';

export const TranscriptContainer = lazy(() => import('./TranscriptContainer'));
