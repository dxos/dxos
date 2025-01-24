//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { Input } from '@dxos/react-ui';

import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { createAnchorMap, type ShapeComponentProps, type ShapeDef } from '../../components';
import { useComputeNodeState } from '../hooks';

export const SwitchShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('switch'),
  }),
);

export type SwitchShape = S.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = CreateShapeProps<SwitchShape>;

export const createSwitch = (props: CreateSwitchProps) =>
  createShape<SwitchShape>({ type: 'switch', size: { width: 64, height: 64 }, ...props });

export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const [value, setValue] = useState(false);
  useEffect(() => {
    runtime.setOutput(DEFAULT_OUTPUT, value);
  }, [value]);

  return (
    <div className='flex w-full justify-center items-center' onClick={(ev) => ev.stopPropagation()}>
      <Input.Root>
        <Input.Switch checked={value} onCheckedChange={(value) => setValue(value)} />
      </Input.Root>
    </div>
  );
};

export const switchShape: ShapeDef<SwitchShape> = {
  type: 'switch',
  name: 'Switch',
  icon: 'ph--toggle-left--regular',
  component: SwitchComponent,
  createShape: createSwitch,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
