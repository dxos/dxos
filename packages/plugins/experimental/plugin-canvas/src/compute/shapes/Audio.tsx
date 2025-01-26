//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { Icon } from '@dxos/react-ui';

import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
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
