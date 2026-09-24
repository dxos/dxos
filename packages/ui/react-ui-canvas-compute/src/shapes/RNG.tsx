//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { Icon, type IconProps } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { type RandomShape } from './rng-def.ts';

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

  // The node frame takes a pointer press as select-and-drag, capturing the pointer so the click never
  // reaches this control; the gesture has to stop here for the operation to fire.
  const stopGesture: IconProps['onPointerDown'] = (ev) => ev.stopPropagation();

  const handleClick: IconProps['onClick'] = (ev) => {
    ev.stopPropagation();
    runtime.setOutput(DEFAULT_OUTPUT, Math.random());
    setSpin(true);
  };

  return (
    <div className='flex grow items-center justify-center'>
      <Icon
        icon={icon}
        classNames={spin && 'animate-[spin_1s]'}
        size={10}
        onPointerDown={stopGesture}
        onClick={handleClick}
      />
    </div>
  );
};
