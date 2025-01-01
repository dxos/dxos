//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { BaseComputeShape, type BaseComputeShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { useEditorContext } from '../../hooks';
import { Timer } from '../graph';

export const TimerShape = S.extend(
  BaseComputeShape,
  S.Struct({
    type: S.Literal('timer'),
  }),
);

export type TimerShape = S.Schema.Type<typeof TimerShape>;

export type CreateTimerProps = Omit<BaseComputeShapeProps<Timer>, 'size'>;

export const createTimer = (props: CreateTimerProps): TimerShape => ({
  ...props,
  type: 'timer',
  node: new Timer(),
  size: { width: 64, height: 64 },
});

export const TimerComponent = ({ shape }: ShapeComponentProps<TimerShape>) => {
  const { actionHandler } = useEditorContext(); // TODO(burdon): Narrow to shape context.
  const [value, setValue] = useState(false);

  // TODO(burdon): Note the actual time should come from the associated compute node.
  // const timer = useRef<NodeJS.Timeout>();
  // useEffect(() => {
  //   clearInterval(timer.current);
  //   if (value) {
  //     timer.current = setInterval(() => {
  //       void actionHandler?.({ type: 'run', ids: [shape.id] });
  //     }, shape.node.interval);
  //   }
  //
  //   return () => clearInterval(timer.current);
  // }, [actionHandler, value]);

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
  getAnchors: (shape) => createAnchors(shape, { 'output.#default': { x: 1, y: 0 } }),
};
