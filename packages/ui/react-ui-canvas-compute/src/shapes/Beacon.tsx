//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT, isTruthy } from '@dxos/conductor';
import * as Icon from '@dxos/react-ui/Icon';

import { useComputeNodeState } from '../hooks/index.ts';
import { type BeaconShape } from './beacon-def.ts';
import { type ComputeNodeViewProps } from './common/index.ts';

export const BeaconComponent = ({ node: shape }: ComputeNodeViewProps<BeaconShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : false;

  return (
    <div className='flex w-full justify-center items-center'>
      <Icon.Icon
        icon='ph--sun--regular'
        classNames={['transition opacity-20 duration-1000', isTruthy(value) && 'opacity-100 text-yellow-500']}
        size='xl'
      />
    </div>
  );
};
