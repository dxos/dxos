//
// Copyright 2025 DXOS.org
//

import React, { useState, useCallback, useEffect } from 'react';

import { log } from '@dxos/log';

import { DebugInfo } from './DebugInfo';
import { useAudioStream, usePipeline } from '../hooks';

export type VoiceProps = {
  debug?: boolean;
  active?: boolean;
  model?: string;
};

export const Voice = ({ debug = false, active = false, model = 'Xenova/whisper-base' }: VoiceProps) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');

  const {
    isLoaded: isModelLoaded,
    isLoading: isModelLoading,
    gpuInfo,
    error: pipelineError,
    transcribe,
  } = usePipeline({ active, model, debug });

  useEffect(() => {
    if (debug) {
      log('Voice component state:', {
        active,
        isModelLoaded,
        isModelLoading,
        pipelineError,
        isTranscribing,
      });
    }
  }, [active, debug, isModelLoaded, isModelLoading, pipelineError, isTranscribing]);

  const handleAudioData = useCallback(
    async (audioData: Float32Array) => {
      if (isTranscribing) {
        return;
      }

      setIsTranscribing(true);
      try {
        const result = await transcribe(audioData, {
          samplingRate: 16000,
          chunkLength: 5,
          strideLength: 1,
          returnTimestamps: false,
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

  const {
    stream,
    error: audioError,
    audioLevel,
  } = useAudioStream({
    active: active && isModelLoaded,
    debug,
    // onAudioData: handleAudioData,
  });

  useEffect(() => {
    if (debug) {
      log('Audio stream state:', {
        hasStream: !!stream,
        audioError,
        audioLevel,
        shouldBeActive: active && isModelLoaded,
      });
    }
  }, [debug, stream, audioError, audioLevel, active, isModelLoaded]);

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
