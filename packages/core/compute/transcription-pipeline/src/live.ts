//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Queue from 'effect/Queue';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { type ContentBlock } from '@dxos/types';

import { PipelineRuntime, type RunOptions } from './PipelineRuntime';
import { TranscriptEvent } from './TranscriptEvent';

/**
 * Imperative handle to a running pipeline fed by a live ASR source. The source pushes events as they
 * arrive rather than yielding a pre-materialized stream.
 */
export type LivePipeline = {
  /** Append a transcript block produced by the ASR source. */
  block: (block: ContentBlock.Transcript) => void;
  /** Report that the speaker has been silent for `sinceMs` (triggers on-silence stages). */
  silence: (sinceMs: number) => void;
  /** Emit a periodic tick (triggers periodic stages). */
  tick: () => void;
  /** Close the source; resolves once the stream ends and all in-flight stages have drained. */
  end: () => Promise<void>;
};

// A sentinel terminates the source after all queued events are consumed, so the run drains rather
// than dropping in-flight blocks (Queue.shutdown would discard anything not yet pulled).
const END = Symbol('end');
type Item = TranscriptEvent | typeof END;

/**
 * Drives {@link PipelineRuntime} from a live ASR source: blocks pushed via the returned handle are
 * enqueued onto the runtime's source stream; `end` closes the stream so the run drains and resolves.
 * This is the single orchestration entry point for live capture — callers supply only the stages,
 * commit sink, and (optional) lookup, mirroring a scripted `PipelineRuntime.run`.
 */
export const runLivePipeline = (options: Omit<RunOptions, 'source'>): LivePipeline => {
  const queue = Effect.runSync(Queue.unbounded<Item>());
  const source = Stream.fromQueue(queue).pipe(Stream.takeWhile((item): item is TranscriptEvent => item !== END));
  const done = EffectEx.runPromise(PipelineRuntime.run({ ...options, source }));
  const offer = (item: Item) => Effect.runSync(Queue.offer(queue, item));
  return {
    block: (block) => offer(TranscriptEvent.block(block)),
    silence: (sinceMs) => offer(TranscriptEvent.silence(sinceMs)),
    tick: () => offer(TranscriptEvent.tick()),
    end: async () => {
      offer(END);
      await done;
      Effect.runSync(Queue.shutdown(queue));
    },
  };
};
