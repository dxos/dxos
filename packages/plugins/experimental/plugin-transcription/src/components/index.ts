//
// Copyright 2025 DXOS.org
//

import { lazy } from 'react';

export * from './Transcription';
export * from './TranscriptionContainer';

export const TranscriptionContainer = lazy(() => import('./TranscriptionContainer'));
