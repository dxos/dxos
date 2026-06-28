//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';

import { TranscriptionCapabilities } from '#types';

import { type Transcriber } from '../transcriber';

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export const useTranscriber = ({
  audioStreamTrack,
  recorderConfig,
  transcriberConfig,
  transcribe,
  onSegments,
}: Partial<TranscriptionCapabilities.TranscriberProviderProps>) => {
  const [transcriberProvider] = useCapabilities(TranscriptionCapabilities.TranscriberProvider);

  // Initialize audio transcription.
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!transcriberProvider || !audioStreamTrack || !onSegments) {
      return undefined;
    }

    return transcriberProvider({
      audioStreamTrack,
      recorderConfig,
      transcriberConfig,
      transcribe,
      onSegments,
    });
  }, [transcriberProvider, audioStreamTrack, recorderConfig, transcriberConfig, transcribe, onSegments]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
