//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { VideoOperation } from '#types';

// TODO(burdon): Import from EDGE.
export * as TranscriptionService from './TranscriptionService.ts';

export const VideoOperationHandlerSet = OperationHandlerSet.lazy([
  VideoOperation.Transcribe.pipe(Operation.lazyHandler(() => import('./transcribe.ts'))),
  VideoOperation.Summarize.pipe(Operation.lazyHandler(() => import('./summarize.ts'))),
  VideoOperation.FetchDescription.pipe(Operation.lazyHandler(() => import('./fetch-description.ts'))),
  VideoOperation.FetchTranscript.pipe(Operation.lazyHandler(() => import('./fetch-transcript.ts'))),
]);
