//
// Copyright 2025 DXOS.org
//

import { lazy } from 'react';

export * from './Transcript';
export * from './TranscriptContainer';
export * from './TranscriptionSettings';

export const TranscriptContainer = lazy(() => import('./TranscriptContainer'));
