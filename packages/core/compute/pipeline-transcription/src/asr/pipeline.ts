//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

import { type LivePipeline, type RunOptions, runLivePipeline } from '../runtime/index.ts';
import { SentenceBuffer } from './sentence-buffer.ts';
import { type CreateTranscriber } from './transcriber.ts';

export type AsrPipelineOptions = Omit<RunOptions, 'source'> & {
  /** The speech-to-text session: RealtimeKit in the browser, a scripted one offline. */
  createTranscriber: CreateTranscriber;
  /**
   * Re-segment the ASR output into complete sentences before it enters the pipeline, merging
   * fragments that the transcriber cut mid-sentence. @default false
   */
  segmentSentences?: boolean;
  /** Optional raw-segment hook invoked before each block enters the pipeline (e.g. live display). */
  onSegment?: (block: ContentBlock.Transcript) => void;
  /** Silence (ms) reported on `end` so on-silence stages fire over the final window. */
  drainSilenceMs?: number;
};

/** Imperative handle to a running ASR → pipeline session. */
export type AsrPipeline = {
  /** Open the transcriber. */
  open: () => Promise<void>;
  /** Begin sending audio for transcription. */
  start: () => void;
  /** Stop sending audio (segments still pending are delivered by `end`). */
  stop: () => void;
  /** Stop waiting for pending segments. */
  abort: () => void;
  /** Deliver pending segments, signal silence, and drain the pipeline. */
  end: () => Promise<void>;
};

/**
 * The single end-to-end wiring: an ASR source ({@link Transcriber}) feeding the live orchestration
 * engine ({@link runLivePipeline}). Every consumer (editor driver, message-list recording, stories)
 * differs only by transcriber, stages, and commit sink — this is the one place audio → text → stages →
 * sink is assembled.
 */
export const runAsrPipeline = ({
  createTranscriber,
  segmentSentences = false,
  onSegment,
  drainSilenceMs = 5_000,
  ...runOptions
}: AsrPipelineOptions): AsrPipeline => {
  const live: LivePipeline = runLivePipeline(runOptions);
  // Optionally merge mid-sentence ASR fragments into complete sentences before the pipeline sees them.
  const sentences = segmentSentences ? new SentenceBuffer() : undefined;
  const emit = (block: ContentBlock.Transcript) => {
    onSegment?.(block);
    live.block(block);
  };
  const handle = (blocks: ContentBlock.Transcript[]) => {
    for (const block of blocks) {
      if (sentences) {
        for (const sentence of sentences.push(block)) {
          emit(sentence);
        }
      } else {
        emit(block);
      }
    }
  };
  const transcriber = createTranscriber({ onSegments: async (blocks: ContentBlock.Transcript[]) => handle(blocks) });

  return {
    open: async () => {
      await transcriber.open();
    },
    start: () => transcriber.start(),
    stop: () => transcriber.stop(),
    abort: () => transcriber.abort(),
    end: async () => {
      await transcriber.flush();
      // Emit any sentence still buffered after the final flush.
      if (sentences) {
        for (const sentence of sentences.flush()) {
          emit(sentence);
        }
      }
      live.silence(drainSilenceMs);
      await live.end();
      await transcriber.close();
    },
  };
};
