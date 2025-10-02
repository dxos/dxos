//
// Copyright 2024 DXOS.org
//

import { useEffect, useRef } from 'react';

import { log } from '@dxos/log';

export type UseAudioStream = {
  getData: () => Uint8Array | undefined;
  getAverage: () => number;
};

/**
 * Web audio data channel.
 * https://webaudio.github.io/web-audio-api
 */
// TODO(burdon): Factor out; reconcile with transcription API.
export const useAudioStream = (active?: boolean): UseAudioStream => {
  const audioContextRef = useRef<AudioContext>(undefined);
  const analyserRef = useRef<AnalyserNode>(undefined);
  const dataArrayRef = useRef<Uint8Array>(undefined);
  const tracksRef = useRef<MediaStreamTrack[]>(undefined);
  const sourceRef = useRef<MediaStreamAudioSourceNode>(undefined);

  const close = () => {
    log.info('closing microphone');
    sourceRef.current?.disconnect();
    sourceRef.current = undefined;
    tracksRef.current?.forEach((track) => track.stop());
    tracksRef.current = undefined;
    void audioContextRef.current?.close();
    audioContextRef.current = undefined;
  };

  useEffect(() => {
    if (!active) {
      close();
      return;
    }

    const initAudio = async () => {
      try {
        log.info('initializing microphone');

        // Get audio stream from microphone, then create audio context and source.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tracksRef.current = stream.getTracks();
        audioContextRef.current = new AudioContext();

        // Create audio analyser node and connect it to the audio source.
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64;
        // console.log(analyserRef.current.frequencyBinCount, analyserRef.current.smoothingTimeConstant);
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        // Connect.
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
      } catch (err) {
        log.error('error accessing microphone:', err);
      }
    };

    void initAudio();

    return () => {
      close();
    };
  }, [active]);

  return {
    getData: () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return undefined;
      }

      analyserRef.current?.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      return dataArrayRef.current;
    },

    getAverage: () => {
      if (!analyserRef.current || !dataArrayRef.current) {
        return 0;
      }

      analyserRef.current.getByteFrequencyData(dataArrayRef.current as Uint8Array<ArrayBuffer>);
      // TODO(burdon): Use https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/smoothingTimeConstant
      const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
      const amplitude = average / 255; // Normalize to 0-1.
      return amplitude > 0.1 ? amplitude : 0; // Sensitivity.
    },
  };
};
