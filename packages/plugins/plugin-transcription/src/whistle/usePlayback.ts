//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useRef, useState } from 'react';

import { WHISTLE_SAMPLE_RATE } from './protocol.ts';
import { type Recording } from './recording.ts';

export type Playback = {
  /** Id of the range playing, if any. */
  playing?: string;
  /** Plays `start`–`end` seconds of the recording once, stopping whatever was playing. */
  play: (id: string, start: number, end: number) => void;
  stop: () => void;
};

/** Plays ranges of a {@link Recording} one at a time. */
export const usePlayback = (recording: Recording): Playback => {
  const [playing, setPlaying] = useState<string>();
  const contextRef = useRef<AudioContext>(undefined);
  const sourceRef = useRef<AudioBufferSourceNode>(undefined);

  const stop = useCallback(() => {
    const source = sourceRef.current;
    sourceRef.current = undefined;
    source?.stop();
    setPlaying(undefined);
  }, []);

  const play = useCallback(
    (id: string, start: number, end: number) => {
      stop();
      const samples = recording.samples(start, end);
      if (samples.length === 0) {
        return;
      }
      contextRef.current ??= new AudioContext();
      const context = contextRef.current;
      const buffer = context.createBuffer(1, samples.length, WHISTLE_SAMPLE_RATE);
      buffer.copyToChannel(samples, 0);
      const source = new AudioBufferSourceNode(context, { buffer });
      source.connect(context.destination);
      source.onended = () => {
        if (sourceRef.current === source) {
          sourceRef.current = undefined;
          setPlaying(undefined);
        }
      };
      sourceRef.current = source;
      setPlaying(id);
      void context.resume();
      source.start();
    },
    [recording, stop],
  );

  useEffect(
    () => () => {
      sourceRef.current?.stop();
      void contextRef.current?.close();
    },
    [],
  );

  return { playing, play, stop };
};
