//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import { type ContentBlock, type Transcript } from '@dxos/types';

import { type StageWrite } from '../types';
import { type CommitFn } from './PipelineRuntime';

/**
 * In-memory commit sink: records every {@link StageWrite} for assertions and testbench rendering.
 */
export type CaptureCommit = {
  readonly commit: CommitFn;
  readonly writes: StageWrite[];
};

export const captureCommit = (): CaptureCommit => {
  const writes: StageWrite[] = [];
  const commit: CommitFn = (write) =>
    Effect.sync(() => {
      writes.push(write);
    });
  return { commit, writes };
};

/**
 * ECHO commit: applies a stage's output to live objects. Block patches are applied to the block
 * objects in the window slice the stage was invoked with (the runtime passes that slice); the
 * transcript patch is applied to the `Transcript` object. Mutating a live ECHO object propagates
 * via reactivity; a containing `Obj.update` transaction (when present) batches the writes.
 */
export const makeEchoCommit =
  (transcript: Transcript.Transcript): CommitFn =>
  (write, window) =>
    Effect.sync(() => {
      for (const update of write.blockUpdates ?? []) {
        const block: ContentBlock.Transcript | undefined = window[update.index];
        if (!block) {
          continue;
        }
        const { index: _index, ...patch } = update;
        // Live ECHO objects must be mutated inside Obj.update; plain blocks (testbench) assign directly.
        if (Obj.isObject(block)) {
          Obj.update(block, (block) => Object.assign(block, patch));
        } else {
          Object.assign(block, patch);
        }
      }
      if (write.transcriptUpdate) {
        Obj.update(transcript, (transcript) => Object.assign(transcript, write.transcriptUpdate));
      }
    });
