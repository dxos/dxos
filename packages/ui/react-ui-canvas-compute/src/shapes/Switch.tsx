//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { Input } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef, createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const SwitchShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('switch'),
  }),
);

export type SwitchShape = Schema.Schema.Type<typeof SwitchShape>;

export type CreateSwitchProps = CreateShapeProps<SwitchShape>;

export const createSwitch = (props: CreateSwitchProps) =>
  createShape<SwitchShape>({ type: 'switch', size: { width: 64, height: 64 }, ...props });

// TODO(burdon): Should model as a constant.
export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const [value, setValue] = useState(false);
  useEffect(() => {
    runtime.setOutput(DEFAULT_OUTPUT, value);
  }, [value]);

  return (
    <div className='flex is-full justify-center items-center' onClick={(ev) => ev.stopPropagation()}>
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
