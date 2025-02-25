//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { useEffect, useState } from 'react';

import { log } from '@dxos/log';

export type UseAudioState = {
  stream?: MediaStream;
  track?: MediaStreamTrack;
  audio?: HTMLAudioElement;
};

export const useAudio = (audioUrl: string): UseAudioState => {
  // Create the stream.
  const [{ stream, track, audio }, setStream] = useState<UseAudioState>({});
  useEffect(() => {
    const t = setTimeout(async () => {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      log.info('loaded audio', { audioUrl, status: response.status });

      // TODO(burdon): Doesn't load entire file.
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
        stream: destination.stream,
        track: destination.stream.getAudioTracks()[0],
        audio,
      });
    });

    return () => clearTimeout(t);
  }, [audioUrl]);

  return { stream, track, audio };
};
