//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { useEditorContext } from '../../hooks';
import { createId } from '../../testing';
import { Polygon } from '../../types';

const interval = 1_000;

export const TimerShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('timer'),
    interval: S.optional(S.Number),
  }),
);

export type TimerShape = S.Schema.Type<typeof TimerShape>;

export type CreateTimerProps = Omit<TimerShape, 'type' | 'size'>;

export const createTimer = ({ id, ...rest }: CreateTimerProps): TimerShape => ({
  id,
  type: 'timer',
  size: { width: 64, height: 64 },
  ...rest,
});

export const TimerComponent = ({ shape }: ShapeComponentProps<TimerShape>) => {
  const { actionHandler } = useEditorContext(); // TODO(burdon): Narrow to shape context.
  const [value, setValue] = useState(false);

  // TODO(burdon): Note the actual time should come from the associated compute node.
  const timer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    clearInterval(timer.current);
    if (value) {
      timer.current = setInterval(() => {
        void actionHandler?.({ type: 'run', ids: [shape.id] });
      }, shape.interval ?? interval);
    }

    return () => clearInterval(timer.current);
  }, [actionHandler, value]);

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
  create: () => createTimer({ id: createId(), center: { x: 0, y: 0 } }),
  getAnchors: (shape) => createAnchors(shape, { 'output.#default': { x: 1, y: 0 } }),
};
