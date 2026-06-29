//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import {
  type AsrPipeline,
  type CommitFn,
  type EntityLookup,
  type Stage,
  type TranscribeConfig,
  runAsrPipeline,
} from '@dxos/transcription-pipeline';
import { type ContentBlock } from '@dxos/types';

import { MediaStreamRecorder } from '../recorder';
import { type PipelinePhase } from '../types';
import { useAudioTrack } from './useAudioTrack';

// Recorder chunk interval; the transcriber's chunk threshold derives from this.
const RECORDER_INTERVAL_MS = 200;

// Silence reported on drain so on-silence stages (e.g. summarization) fire over the final window.
const DRAIN_SILENCE_MS = 5_000;

const DEFAULT_TRANSCRIBE_CONFIG: TranscribeConfig = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

export type RecordingPipelineOptions = {
  /** Override the transcriber chunk configuration. */
  config?: Partial<TranscribeConfig>;
  /** Re-segment ASR output into complete sentences before the pipeline (merges mid-sentence cuts). */
  segmentSentences?: boolean;
  /**
   * Raw capture flag — recording (mic) or playing (file). When it flips false the hook drains
   * (flushing the transcriber's buffered audio) before returning to idle.
   */
  active: boolean;
  /** Use the microphone as the ASR source; the hook owns the track and keeps it alive through drain. */
  microphone?: boolean;
  /** Externally-supplied track (file source). Used only when `microphone` is false. */
  track?: MediaStreamTrack;
  /** Audio constraints for the microphone source. */
  audioConstraints?: MediaTrackConstraints;
  /** Ordered pipeline stages applied to captured blocks. */
  stages: readonly Stage<any, any>[];
  /** Commit sink for enriched stage output. */
  commit: CommitFn;
  /** Optional entity-reference resolver injected into stages. */
  lookup?: EntityLookup;
  /** Optional raw-segment hook (pre-pipeline), e.g. for live display before enrichment. */
  onSegment?: (block: ContentBlock.Transcript) => void;
};

export type RecordingPipeline = {
  /** Lifecycle phase (idle → recording → draining → idle). */
  phase: PipelinePhase;
};

/**
 * Single ASR-capture engine binding for React consumers: drives an {@link AsrPipeline}
 * ({@link runAsrPipeline}) off a capture flag, sourcing audio from the microphone (owned here) or an
 * external track. The editor driver, message-list recording, and stories all build on this — varying
 * only by source, stages, and commit sink.
 */
export const useRecordingPipeline = ({
  active,
  microphone,
  track: externalTrack,
  audioConstraints,
  stages,
  commit,
  lookup,
  onSegment,
  config,
  segmentSentences,
}: RecordingPipelineOptions): RecordingPipeline => {
  // Phase machine: hold 'recording' for the commit when `active` flips off, then 'draining' until the
  // transcriber flushes, then 'idle' — so the tail of speech and its enrichment are not lost.
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const inUse = phase !== 'idle';
  useEffect(() => {
    setPhase((current) => (active ? 'recording' : current === 'recording' ? 'draining' : current));
  }, [active]);

  // Keep the mic alive through the drain; external (file) tracks are owned by the caller.
  const micTrack = useAudioTrack(!!microphone && inUse, audioConstraints);
  const track = microphone ? micTrack : externalTrack;

  // A fresh recorder per track so a stopped (encoder-flushed) instance is never reused.
  const recorder = useMemo(
    () =>
      track
        ? new MediaStreamRecorder({ mediaStreamTrack: track, config: { interval: RECORDER_INTERVAL_MS } })
        : undefined,
    [track],
  );

  const pipelineRef = useRef<AsrPipeline | null>(null);

  // Start a live ASR pipeline session when recording. Stages/commit/lookup are captured for the
  // lifetime of the session (a config change mid-recording would orphan the run).
  useEffect(() => {
    if (phase !== 'recording' || !recorder) {
      return;
    }
    const asr = runAsrPipeline({
      recorder,
      config: { ...DEFAULT_TRANSCRIBE_CONFIG, ...config },
      segmentSentences,
      stages,
      commit,
      lookup,
      onSegment,
      drainSilenceMs: DRAIN_SILENCE_MS,
    });
    pipelineRef.current = asr;
    let cancelled = false;
    void asr.open().then(
      () => {
        if (!cancelled) {
          asr.start();
        }
      },
      (err) => {
        if (!cancelled) {
          log.catch(err);
          setPhase('idle');
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recorder]);

  // Drain on stop: flush buffered audio, signal silence, end the session.
  useEffect(() => {
    if (phase !== 'draining') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await pipelineRef.current?.end();
      } catch (err) {
        log.catch(err);
      } finally {
        pipelineRef.current = null;
        if (!cancelled) {
          setPhase((current) => (current === 'draining' ? 'idle' : current));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

  return { phase };
};
