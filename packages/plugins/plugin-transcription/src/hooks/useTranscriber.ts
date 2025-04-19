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
  onSegments,
}: Partial<TranscriptionCapabilities.GetTranscriberProps>) => {
  const [getTranscriber] = useCapabilities(TranscriptionCapabilities.Transcriber);

  // Initialize audio transcription.
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!onSegments || !audioStreamTrack || !getTranscriber) {
      return undefined;
    }

    return getTranscriber({ audioStreamTrack, onSegments });
  }, [audioStreamTrack, onSegments, getTranscriber]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
