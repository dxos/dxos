//
// Copyright 2025 DXOS.org
//

import { lazy } from '@dxos/app-framework';

export const AppGraphBuilder = lazy(() => import('./app-graph-builder'));
export const IntentResolver = lazy(() => import('./intent-resolver'));
export const MeetingTranscriptionState = lazy(() => import('./meeting-transcription-state'));
export const ReactSurface = lazy(() => import('./react-surface'));
export const Transcriber = lazy(() => import('./transcriber'));

export * from './capabilities';
