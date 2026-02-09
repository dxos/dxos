//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { Icon, type IconProps } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const RandomShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('rng'),
    min: Schema.optional(Schema.Number),
    max: Schema.optional(Schema.Number),
  }),
);

export type RandomShape = Schema.Schema.Type<typeof RandomShape>;

export type CreateRandomProps = CreateShapeProps<RandomShape>;

export const createRandom = (props: CreateRandomProps) =>
  createShape<RandomShape>({
    type: 'rng',
    size: { width: 64, height: 64 },
    ...props,
  });

const icons = [
  'ph--dice-one--regular',
  'ph--dice-two--regular',
  'ph--dice-three--regular',
  'ph--dice-four--regular',
  'ph--dice-five--regular',
  'ph--dice-six--regular',
];

const pickIcon = () => icons[Math.floor(Math.random() * icons.length)];

// TODO(burdon): Optional range.
export const RandomComponent = ({ shape }: ShapeComponentProps<RandomShape>) => {
  const { runtime } = useComputeNodeState(shape);

  const [spin, setSpin] = useState(false);
  const [icon, setIcon] = useState(pickIcon());
  useEffect(() => {
    if (!spin) {
      return;
    }

    const i = setInterval(() => setIcon(pickIcon()), 250);
    const t1 = setTimeout(() => clearInterval(i), 900);
    const t2 = setTimeout(() => setSpin(false), 1_100);
    return () => {
      clearInterval(i);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [spin]);

  const handleClick: IconProps['onClick'] = (ev) => {
    ev.stopPropagation();
    runtime.setOutput(DEFAULT_OUTPUT, Math.random());
    setSpin(true);
  };

  return (
    <div className='flex grow items-center justify-center'>
      <Icon icon={icon} classNames={spin && 'animate-[spin_1s]'} size={10} onClick={handleClick} />
    </div>
  );
};

export const randomShape: ShapeDef<RandomShape> = {
  type: 'rng',
  name: 'Random',
  icon: 'ph--dice-six--regular',
  component: RandomComponent,
  createShape: createRandom,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
