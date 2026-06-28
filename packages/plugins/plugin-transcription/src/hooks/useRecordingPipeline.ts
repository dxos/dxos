//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { log } from '@dxos/log';
import {
  type CommitFn,
  type EntityLookup,
  type LivePipeline,
  type Stage,
  runLivePipeline,
} from '@dxos/transcription-pipeline';
import { type ContentBlock } from '@dxos/types';

import { type TranscriptionCapabilities } from '#types';

import { useAudioTrack } from './useAudioTrack';
import { useTranscriber } from './useTranscriber';

// Recorder chunk interval; the transcriber's chunk threshold derives from this.
const RECORDER_INTERVAL_MS = 200;

// Silence reported on drain so on-silence stages (e.g. summarization) fire over the final window.
const DRAIN_SILENCE_MS = 5_000;

export type RecordingPipelineOptions = {
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
  /** Override the transcriber chunk configuration. */
  transcriberConfig?: TranscriptionCapabilities.TranscriberProviderProps['transcriberConfig'];
};

export type RecordingPipeline = {
  /** Lifecycle phase (idle → recording → draining → idle). */
  phase: TranscriptionCapabilities.PipelinePhase;
};

/**
 * Single ASR-capture engine shared by every consumer: drives the {@link useTranscriber} lifecycle off
 * a capture flag and feeds its segments through {@link runLivePipeline} (the one orchestration engine)
 * to the supplied commit sink. Consumers vary only by source (mic vs external track), stages, and sink
 * — the editor driver, the message-list recording, and the stories all build on this.
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
  transcriberConfig,
}: RecordingPipelineOptions): RecordingPipeline => {
  // Phase machine: hold 'recording' for the commit when `active` flips off, then 'draining' until the
  // transcriber flushes, then 'idle' — so the tail of speech and its enrichment are not lost.
  const [phase, setPhase] = useState<TranscriptionCapabilities.PipelinePhase>('idle');
  const inUse = phase !== 'idle';
  useEffect(() => {
    setPhase((current) => (active ? 'recording' : current === 'recording' ? 'draining' : current));
  }, [active]);

  // Keep the mic alive through the drain; external (file) tracks are owned by the caller.
  const micTrack = useAudioTrack(!!microphone && inUse, audioConstraints);
  const track = microphone ? micTrack : externalTrack;

  // One live pipeline session per recording; segments are pushed as the transcriber emits them.
  const pipelineRef = useRef<LivePipeline | null>(null);
  const onSegmentRef = useRef(onSegment);
  onSegmentRef.current = onSegment;

  const handleSegments = useCallback(async (segments: ContentBlock.Transcript[]) => {
    for (const block of segments) {
      onSegmentRef.current?.(block);
      pipelineRef.current?.block(block);
    }
  }, []);

  // Stable identity so re-renders don't recreate (and reopen) the transcriber, discarding its buffer.
  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });
  const transcriberRef = useRef(transcriber);
  transcriberRef.current = transcriber;

  // Start a live pipeline session + open the transcriber when recording. Stages/commit/lookup are
  // captured for the lifetime of the session (a config change mid-recording would orphan the run).
  useEffect(() => {
    if (phase !== 'recording' || !transcriber) {
      return;
    }
    pipelineRef.current = runLivePipeline({ stages, commit, lookup });
    let cancelled = false;
    void transcriber.open().then(
      () => {
        if (!cancelled) {
          transcriber.startChunksRecording();
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
  }, [phase, transcriber]);

  // Drain on stop: flush buffered audio (final transcription), signal silence, end the session.
  useEffect(() => {
    if (phase !== 'draining') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await transcriberRef.current?.flush();
        pipelineRef.current?.silence(DRAIN_SILENCE_MS);
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
