//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { type Transcriber } from '@dxos/pipeline-transcription';

import { type CreateTranscriberOptions, createTranscriber } from '../capture/index.ts';

/**
 * Transcribes a track live while started. Builds a {@link Transcriber} directly from {@link createTranscriber} (no
 * app-framework capability needed, since the browser construction lives in this package); returns `undefined` until a
 * track, a join function and an `onSegments` handler are supplied.
 */
export const useTranscriber = ({
  audioStreamTrack,
  join,
  onSegments,
}: Partial<CreateTranscriberOptions>): Transcriber | undefined => {
  const transcriber = useMemo<Transcriber | undefined>(() => {
    if (!audioStreamTrack || !join || !onSegments) {
      return undefined;
    }

    return createTranscriber({ audioStreamTrack, join, onSegments });
  }, [audioStreamTrack, join, onSegments]);

  useEffect(() => {
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  return transcriber;
};
