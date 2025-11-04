//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { useCapabilities } from '@dxos/app-framework';

import { TranscriptionCapabilities } from '../capabilities';
import { type Transcriber } from '../transcriber';

/**
 * Records audio while user is speaking and transcribes it after user is done speaking.
 */
export const useTranscriber = ({
  audioStreamTrack,
  recorderConfig,
  transcriberConfig,
  onSegments,
}: Partial<TranscriptionCapabilities.GetTranscriberProps>) => {
  const [getTranscriber] = useCapabilities(TranscriptionCapabilities.Transcriber);

  // Initialize audio transcription.
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!getTranscriber || !audioStreamTrack || !onSegments) {
      return undefined;
    }

    return getTranscriber({ audioStreamTrack, recorderConfig, transcriberConfig, onSegments });
  }, [getTranscriber, audioStreamTrack, recorderConfig, transcriberConfig, onSegments]);

  useEffect(
    () => () => {
      void transcriber?.close();
    },
    [transcriber],
  );

  return transcriber;
};
