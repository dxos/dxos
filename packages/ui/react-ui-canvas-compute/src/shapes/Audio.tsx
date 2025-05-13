//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import React, { useEffect, useState } from 'react';

import { Icon } from '@dxos/react-ui';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { useComputeNodeState } from '../hooks';

export const AudioShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('audio'),
  }),
);

export type AudioShape = Schema.Schema.Type<typeof AudioShape>;

export type CreateAudioProps = CreateShapeProps<AudioShape>;

export const createAudio = (props: CreateAudioProps) =>
  createShape<AudioShape>({ type: 'audio', size: { width: 64, height: 64 }, ...props });

export const AudioComponent = ({ shape }: ShapeComponentProps<AudioShape>) => {
  const { node } = useComputeNodeState(shape);
  const [active, setActive] = useState(false);
  useEffect(() => {
    node.value = active;
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
