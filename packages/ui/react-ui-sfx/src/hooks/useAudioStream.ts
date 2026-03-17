//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef } from 'react';

import { log } from '@dxos/log';

export type UseAudioStream = {
  getData: () => Uint8Array | undefined;
  getTimeDomainData: () => Uint8Array | undefined;
  getAverage: () => number;
};

export type UseAudioStreamOptions = {
  /** Use an existing AudioNode as source instead of microphone. When set, microphone is never used. */
  source?: AudioNode;
  /** When true, use microphone as source. Ignored when `source` is provided. */
  microphone?: boolean;
  /** AnalyserNode FFT size. Must be a power of 2. Higher = more time-domain samples for waveform mode. Default 64. */
  fftSize?: number;
};

/**
 * Web audio data channel.
 * https://webaudio.github.io/web-audio-api
 */
export const useAudioStream = (active?: boolean, options?: UseAudioStreamOptions): UseAudioStream => {
  const audioContextRef = useRef<AudioContext>(undefined);
  const analyserRef = useRef<AnalyserNode>(undefined);
  const dataArrayRef = useRef<Uint8Array>(undefined);
  const tracksRef = useRef<MediaStreamTrack[]>(undefined);
  const sourceRef = useRef<AudioNode>(undefined);

  const close = () => {
    sourceRef.current?.disconnect();
    sourceRef.current = undefined;
    tracksRef.current?.forEach((track) => track.stop());
    tracksRef.current = undefined;
    // Only close the AudioContext if we created it (microphone mode).
    if (!options?.source) {
      void audioContextRef.current?.close();
    }
    audioContextRef.current = undefined;
  };

  useEffect(() => {
    if (!active) {
      close();
      return;
    }

    const initAudio = async () => {
      try {
        if (options?.source) {
          // Use provided AudioNode source.
          audioContextRef.current = (options.source as any).context;
          analyserRef.current = audioContextRef.current!.createAnalyser();
          analyserRef.current.fftSize = options?.fftSize ?? 64;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
          options.source.connect(analyserRef.current);
          sourceRef.current = options.source;
        } else if (!options || (!('source' in options) && options.microphone !== false)) {
          // Use microphone when no options provided, or when source key is absent and microphone not disabled.
          log.info('initializing microphone');
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tracksRef.current = stream.getTracks();
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = options?.fftSize ?? 64;
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
          sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current.connect(analyserRef.current);
        }
      } catch (err) {
        log.error('error accessing audio:', err);
      }
    };

    void initAudio();

    return () => {
      close();
    };
  }, [active, options?.source, options?.fftSize]);

  return {
    getData: () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return undefined;
      }

      analyserRef.current?.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      return dataArrayRef.current;
    },

    getTimeDomainData: () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return undefined;
      }

      analyserRef.current.getByteTimeDomainData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      return dataArrayRef.current;
    },

    getAverage: () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return 0;
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      const amplitude = average / 255;
      return amplitude > 0.1 ? amplitude : 0;
    },
  };
};
