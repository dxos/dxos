//
// Copyright 2025 DXOS.org
//

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';

export type UseAudioState = {
  audio?: HTMLAudioElement;
  stream?: MediaStream;
  track?: MediaStreamTrack;
};

export const useAudioFile = (audioUrl: string): UseAudioState => {
  const [{ audio, stream, track }, setStream] = useState<UseAudioState>({});
  useEffect(() => {
    const t = setTimeout(async () => {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const audio = new Audio();
      audio.src = URL.createObjectURL(blob);
      await new Promise<void>((resolve, reject) => {
        audio.addEventListener(
          'error',
          (err) => {
            log.error('error', { err });
            reject(err);
          },
          { once: true },
        );
        audio.addEventListener(
          'canplay',
          () => {
            log.info('starting...');
            resolve();
          },
          { once: true },
        );
        audio.load();
      });

      const ctx = new AudioContext();

      const destination = ctx.createMediaStreamDestination();
      destination.channelCount = 1;

      const source = ctx.createMediaElementSource(audio);
      source.connect(destination);

      setStream({
        audio,
        stream: destination.stream,
        track: destination.stream.getAudioTracks()[0],
      });
    });

    return () => clearTimeout(t);
  }, [audioUrl]);

  return { audio, stream, track };
};
