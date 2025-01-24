//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { Icon, type IconProps } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { useComputeNodeState } from '../hooks';

export const RandomShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('rng'),
    min: S.optional(S.Number),
    max: S.optional(S.Number),
  }),
);

export type RandomShape = S.Schema.Type<typeof RandomShape>;

export type CreateRandomProps = CreateShapeProps<RandomShape>;

export const createRandom = (props: CreateRandomProps) =>
  createShape<RandomShape>({ type: 'rng', size: { width: 64, height: 64 }, ...props });

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
    const t = setTimeout(() => {
      clearInterval(i);
      setSpin(false);
    }, 1_100);
    return () => {
      clearInterval(i);
      clearTimeout(t);
    };
  }, [spin]);

  const handleClick: IconProps['onClick'] = (ev) => {
    ev.stopPropagation();
    runtime.setOutput(DEFAULT_OUTPUT, Math.random());
    setSpin(true);
  };

  return (
    <div className='flex grow items-center justify-center'>
      <Icon icon={icon} classNames={mx(spin && 'animate-[spin_1s]')} size={10} onClick={handleClick} />
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
