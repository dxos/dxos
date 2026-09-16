//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT, isTruthy } from '@dxos/conductor';
import { Icon } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { type BeaconShape } from './beacon-def.ts';

export const BeaconComponent = ({ shape }: ShapeComponentProps<BeaconShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon
        icon='ph--sun--regular'
        classNames={['transition opacity-20 duration-1000', isTruthy(value) && 'opacity-100 text-yellow-500']}
        size={8}
      />
    </div>
  );
};
