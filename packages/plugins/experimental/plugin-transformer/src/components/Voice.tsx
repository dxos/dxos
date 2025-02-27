//
// Copyright 2025 DXOS.org
//

import React, { useState, useCallback, useEffect } from 'react';

import { log } from '@dxos/log';

import { DebugInfo } from './DebugInfo';
import { useAudioStream, usePipeline } from '../hooks';

export type VoiceProps = {
  active?: boolean;
  debug?: boolean;
  model?: string;
};

export const Voice = ({ active, debug, model = 'Xenova/whisper-base' }: VoiceProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');

  const {
    transcribe,
    gpuInfo,
    isLoaded: isModelLoaded,
    isLoading: isModelLoading,
    error: pipelineError,
  } = usePipeline({ active, debug, model });

  const {
    stream,
    error: audioError,
    audioLevel,
  } = useAudioStream({
    active,
    debug,
    // onAudioData: handleAudioData
  });

  const handleAudioData = useCallback(
    async (audioData: Float32Array) => {
      if (!isModelLoaded) {
        return;
      }

      if (isTranscribing) {
        return;
      }

      setIsTranscribing(true);
      try {
        const result = await transcribe(audioData, {
          sampling_rate: 16000,
          chunk_length_s: 5,
          stride_length_s: 1,
          return_timestamps: false,
          language: 'english',
        });

        if (result?.text?.trim()) {
          setTranscription((prev) => prev + ' ' + result.text);
        }
      } catch (err) {
        log.error('transcription error', { err });
        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    [transcribe, isTranscribing],
  );

  useEffect(() => {
    if (debug) {
      log.info('audio state', {
        hasStream: !!stream,
        audioError,
        audioLevel,
        shouldBeActive: active && isModelLoaded,
      });
    }
  }, [debug, stream, audioError, audioLevel, active, isModelLoaded]);

  useEffect(() => {
    if (debug) {
      log.info('transcription state', {
        active,
        isModelLoaded,
        isModelLoading,
        isTranscribing,
        pipelineError,
      });
    }
  }, [active, debug, isModelLoaded, isModelLoading, pipelineError, isTranscribing]);

  return (
    <DebugInfo
      error={audioError || pipelineError || undefined}
      isModelLoading={isModelLoading}
      stream={stream}
      isTranscribing={isTranscribing}
      transcription={transcription}
      audioLevel={audioLevel}
      gpuInfo={gpuInfo}
      model={model}
      debug={debug}
    />
  );
};
