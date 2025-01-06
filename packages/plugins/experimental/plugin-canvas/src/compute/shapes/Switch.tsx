//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { ComputeShape, type CreateShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { Switch } from '../graph';

export const SwitchShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('switch'),
  }),
);

export type SwitchShape = ComputeShape<S.Schema.Type<typeof SwitchShape>, Switch>;

export type CreateSwitchProps = CreateShapeProps<SwitchShape>;

export const createSwitch = ({ id, ...rest }: CreateSwitchProps): SwitchShape => ({
  id,
  type: 'switch',
  node: new Switch(),
  size: { width: 64, height: 64 },
  ...rest,
});

export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) => {
  const [value, setValue] = useState(false);
  useEffect(() => {
    shape.node.setEnabled(value);
  }, [value]);

  return (
    <div className='flex w-full justify-center items-center' onClick={(ev) => ev.stopPropagation()}>
      <Input.Root>
        <Input.Switch
          checked={value}
          onCheckedChange={(ev) => {
            setValue(ev === true);
          }}
        />
      </Input.Root>
    </div>
  );
};

export const switchShape: ShapeDef<SwitchShape> = {
  type: 'switch',
  icon: 'ph--toggle-left--regular',
  component: SwitchComponent,
  createShape: createSwitch,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
