//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { Icon } from '@dxos/react-ui';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { DEFAULT_OUTPUT } from '../graph';
import { useComputeNodeState } from '../hooks';

export const AudioShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('audio'),
  }),
);

export type AudioShape = S.Schema.Type<typeof AudioShape>;

export type CreateAudioProps = CreateShapeProps<AudioShape>;

export const createAudio = ({ id, ...rest }: CreateAudioProps): AudioShape => ({
  id,
  type: 'audio',
  size: { width: 64, height: 64 },
  ...rest,
});

export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const [active, setActive] = useState(false);
  useEffect(() => {
    runtime.setOutput(DEFAULT_OUTPUT, active);
  }, [active]);

  // TODO(burdon): Stream.
  const getAmplitude = useAudioStream(active);

  // https://docs.pmnd.rs/react-three-fiber/api/canvas#render-props
  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon={active ? 'ph--microphone--regular' : 'ph--microphone-slash--regular'}
        classNames={['transition opacity-20 duration-1000', active && 'opacity-100 text-red-500']}
        size={8}
        onClick={() => setActive(!active)}
      />
    </div>
  );
};

export const audioShape: ShapeDef<AudioShape> = {
  type: 'audio',
  name: 'Audio',
  icon: 'ph--microphone--regular',
  component: AudioComponent,
  createShape: createAudio,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};

// TODO(burdon): Factor out; reconcile with calls API.
export const useAudioStream = (active?: boolean): (() => number) => {
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const tracksRef = useRef<MediaStreamTrack[]>();
  const sourceRef = useRef<MediaStreamAudioSourceNode>();
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
    const initAudio = async () => {
      try {
        log.info('initializing microphone');

        // Get audio stream from microphone, then create audio context and source.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        tracksRef.current = stream.getTracks();
        audioContextRef.current = new AudioContext();

        // Create audio analyser node and connect it to the audio source.
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 32;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        // Connect.
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);
      } catch (err) {
        log.error('error accessing microphone:', err);
      }
    };

    if (!active) {
      close();
      return;
    }

    void initAudio();

    return () => {
      close();
    };
  }, [active]);

  const getAmplitude = () => {
    if (!analyserRef.current || !dataArrayRef.current) {
      return 0;
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;
    return average / 255; // Normalize to 0-1.
  };

  return getAmplitude;
};
