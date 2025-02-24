//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { type TranscriptionState } from '../types';

export type Ai = {
  transcription: TranscriptionState;
  setTranscription: (transcription: TranscriptionState) => void;
};

export const useAi = (): Ai => {
  const [transcription, setTranscription] = useState<TranscriptionState>({
    enabled: false,
    lamportTimestamp: 0,
  });

  return {
    transcription,
    setTranscription: (newTranscription: TranscriptionState) => {
      setTranscription({
        ...transcription,
        ...newTranscription,
        lamportTimestamp: newTranscription.lamportTimestamp ?? transcription.lamportTimestamp! + 1,
      });
    },
  };
};
