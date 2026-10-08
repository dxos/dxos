//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { DEFAULT_OUTPUT } from '@dxos/conductor';
import * as Field from '@dxos/react-ui/Field';
import * as Input from '@dxos/react-ui/Input';

import { useComputeNodeState } from '../hooks/index.ts';
import { type ComputeNodeViewProps } from './common/index.ts';
import { type SwitchShape } from './switch-def.ts';

// TODO(burdon): Should model as a constant.
export const SwitchComponent = ({ node: shape }: ComputeNodeViewProps<SwitchShape>) => {
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
      <Field.Root>
        <Input.Switch checked={value} onCheckedChange={({ checked: value }) => setValue(value)} />
      </Field.Root>
    </div>
  );
};
