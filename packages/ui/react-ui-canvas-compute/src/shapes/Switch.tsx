//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';
import { Next } from '@dxos/react-ui/next';

import { useComputeNodeState } from '../hooks/index.ts';
import { type SwitchShape } from './switch-def.ts';

// TODO(burdon): Should model as a constant.
export const SwitchComponent = ({ shape }: ShapeComponentProps<SwitchShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const [value, setValue] = useState(false);
  useEffect(() => {
    runtime.setOutput(DEFAULT_OUTPUT, value);
  }, [value]);

  return (
    // The node frame would otherwise take the press as select-and-drag and capture the pointer, so the
    // switch never sees the click.
    <div
      className='flex w-full justify-center items-center'
      onPointerDown={(ev) => ev.stopPropagation()}
      onClick={(ev) => ev.stopPropagation()}
    >
      <Next.Field.Root>
        <Next.Switch checked={value} onCheckedChange={({ checked: value }) => setValue(value)} />
      </Next.Field.Root>
    </div>
  );
};
