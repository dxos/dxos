//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';

import { type LivePipeline, runLivePipeline } from '../live';
import { type RunOptions } from '../PipelineRuntime';
import { type AudioRecorder } from './audio-recorder';
import { Transcriber, type TranscribeConfig, type TranscribeFn } from './transcriber';

export type AsrPipelineOptions = Omit<RunOptions, 'source'> & {
  /** Audio source — browser `MediaStreamRecorder` or any `AudioRecorder` implementation. */
  recorder: AudioRecorder;
  /** Optional ASR transport override (default: `fetch` to the edge transcription service). */
  transcribe?: TranscribeFn;
  /** Transcriber chunking configuration. */
  transcribeConfig: TranscribeConfig;
  /** Optional raw-segment hook invoked before each block enters the pipeline (e.g. live display). */
  onSegment?: (block: ContentBlock.Transcript) => void;
  /** Silence (ms) reported on `end` so on-silence stages fire over the final window. */
  drainSilenceMs?: number;
};

/** Imperative handle to a running ASR → pipeline session. */
export type AsrPipeline = {
  /** Open the recorder + transcriber. */
  open: () => Promise<void>;
  /** Begin capturing audio for transcription. */
  start: () => void;
  /** Stop capturing (buffered audio is still flushed by `end`). */
  stop: () => void;
  /** Abort the in-flight transcription request. */
  abort: () => void;
  /** Flush buffered audio, signal silence, and drain the pipeline. */
  end: () => Promise<void>;
};

/**
 * The single end-to-end wiring: an ASR source ({@link Transcriber}) feeding the live orchestration
 * engine ({@link runLivePipeline}). Every consumer (editor driver, message-list recording, stories)
 * differs only by recorder, stages, and commit sink — this is the one place audio → text → stages →
 * sink is assembled.
 */
export const runAsrPipeline = ({
  recorder,
  transcribe,
  transcribeConfig,
  onSegment,
  drainSilenceMs = 5_000,
  ...runOptions
}: AsrPipelineOptions): AsrPipeline => {
  const live: LivePipeline = runLivePipeline(runOptions);
  const transcriber = new Transcriber({
    config: transcribeConfig,
    recorder,
    transcribe,
    onSegments: async (blocks: ContentBlock.Transcript[]) => {
      for (const block of blocks) {
        onSegment?.(block);
        live.block(block);
      }
    },
  });

  return {
    open: async () => {
      await transcriber.open();
    },
    start: () => transcriber.startChunksRecording(),
    stop: () => transcriber.stopChunksRecording(),
    abort: () => transcriber.abort(),
    end: async () => {
      await transcriber.flush();
      live.silence(drainSilenceMs);
      await live.end();
      await transcriber.close();
    },
  };
};
