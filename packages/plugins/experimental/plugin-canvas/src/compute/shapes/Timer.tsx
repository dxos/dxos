//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { Timer } from '../graph';

export const TimerShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('timer'),
  }),
);

export type TimerShape = ComputeShape<S.Schema.Type<typeof TimerShape>, Timer>;

export type CreateTimerProps = Omit<TimerShape, 'type' | 'node' | 'size'>;

export const createTimer = (props: CreateTimerProps): TimerShape => ({
  ...props,
  type: 'timer',
  node: new Timer(),
  size: { width: 64, height: 64 },
});

export const TimerComponent = ({ shape }: ShapeComponentProps<TimerShape>) => {
  const [value, setValue] = useState(false);
  useEffect(() => {
    if (value) {
      shape.node.start();
    } else {
      shape.node.stop();
    }
  }, [value]);

  return (
    <div className='flex w-full justify-center items-center' onClick={(ev) => ev.stopPropagation()}>
      <Input.Root>
        <Input.Switch checked={value} onCheckedChange={(checked) => setValue(checked)} />
      </Input.Root>
    </div>
  );
};

export const timerShape: ShapeDef<TimerShape> = {
  type: 'timer',
  icon: 'ph--alarm--regular',
  component: TimerComponent,
  createShape: createTimer,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
