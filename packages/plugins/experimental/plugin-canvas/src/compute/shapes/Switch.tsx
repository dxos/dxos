//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { BaseComputeShape, type BaseComputeShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { Switch } from '../graph';

export const SwitchShape = S.extend(
  BaseComputeShape,
  S.Struct({
    type: S.Literal('switch'),
  }),
);

export type SwitchShape = S.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = Omit<BaseComputeShapeProps<Switch>, 'size'>;

export const createSwitch = ({ id, ...rest }: CreateSwitchProps): SwitchShape => ({
  id,
  type: 'switch',
  node: new Switch(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) => {
  const [value, setValue] = useState(false);

  return (
    <div className='flex w-full justify-center items-center' onClick={(ev) => ev.stopPropagation()}>
      <Input.Root>
        <Input.Switch checked={value} onCheckedChange={(checked) => setValue(checked)} />
      </Input.Root>
    </div>
  );
};

export const switchShape: ShapeDef<SwitchShape> = {
  type: 'switch',
  icon: 'ph--toggle-left--regular',
  component: SwitchComponent,
  createShape: createSwitch,
  getAnchors: (shape) => createAnchors(shape, { 'output.#default': { x: 1, y: 0 } }),
};
