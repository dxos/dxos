//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentBlock } from '@dxos/types';

import { type Stage, StageWrite } from '../types/stage';

export type DiarizationInput = { window: ContentBlock.Transcript[] };

/**
 * Stage ◆ (interface only / deferred): label the speaker of the newest block.
 * Conforms to the `Stage` contract and is inert until a diarization backend is wired.
 */
export const makeDiarizationStage = (): Stage<DiarizationInput> => ({
  id: 'diarize',
  trigger: 'per-block',
  window: { blocks: 1 },
  concurrency: 'latest-wins',
  // TODO: implement diarization (assign speaker identity to the block).
  run: () => Effect.succeed(StageWrite.empty()),
});
