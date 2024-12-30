//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createId } from '../../testing';
import { Polygon } from '../../types';

export const SwitchShape = S.extend(
  Polygon,
  S.Struct({
    type: S.Literal('switch'),
  }),
);

export type SwitchShape = S.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = Omit<SwitchShape, 'type'>;

export const createSwitch = ({ id, ...rest }: CreateSwitchProps): SwitchShape => ({
  id,
  type: 'switch',
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
  create: () => createSwitch({ id: createId(), center: { x: 0, y: 0 }, size: { width: 64, height: 64 } }),
  getAnchors: (shape) => createAnchors(shape, { 'output.#default': { x: 1, y: 0 } }),
};
