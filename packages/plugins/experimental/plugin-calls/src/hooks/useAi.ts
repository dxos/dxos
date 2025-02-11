//
// Copyright 2025 DXOS.org
//

import { useState } from 'react';

import { log } from '@dxos/log';

import { type Transcription } from '../types';

export type Ai = {
  transcription: Transcription;
  setTranscription: (transcription: Transcription) => void;
};

export const useAi = (): Ai => {
  const [transcription, setTranscription] = useState<Transcription>({
    enabled: false,
    lamportTimestamp: 0,
  });

  return {
    transcription,
    setTranscription: (newTranscription: Transcription) => {
      log.info('>>> setTranscription', {
        transcription: {
          ...transcription,
          ...newTranscription,
          lamportTimestamp: newTranscription.lamportTimestamp ?? transcription.lamportTimestamp! + 1,
        },
      });
      setTranscription({
        ...transcription,
        ...newTranscription,
        lamportTimestamp: newTranscription.lamportTimestamp ?? transcription.lamportTimestamp! + 1,
      });
    },
  };
};
