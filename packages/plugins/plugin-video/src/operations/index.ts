//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { VideoOperation } from '#types';

// TODO(burdon): Import from EDGE.
export * as TranscriptionService from './TranscriptionService';

export const VideoOperationHandlerSet = OperationHandlerSet.lazy([
  VideoOperation.Transcribe.pipe(Operation.lazyHandler(() => import('./transcribe'))),
  VideoOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize'))),
  VideoOperation.FetchDescription.pipe(Operation.lazyHandler(() => import('./fetch-description'))),
  VideoOperation.FetchTranscript.pipe(Operation.lazyHandler(() => import('./fetch-transcript'))),
]);
