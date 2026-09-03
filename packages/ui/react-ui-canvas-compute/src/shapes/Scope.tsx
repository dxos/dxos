//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { useAudioStream } from '@dxos/react-ui-audio';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';
import { Chaos, shaderPresets } from '@dxos/react-ui-experimental';

import { useComputeNodeState } from '../hooks/index.ts';
import { type ScopeShape } from './scope-def.ts';

export const ScopeComponent = ({ shape }: ShapeComponentProps<ScopeShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const active = input?.type === 'executed' ? input.value : false;
  const { getAverage } = useAudioStream(active);

  return (
    <div className='flex w-full justify-center items-center bg-black'>
      <Chaos active={active} getValue={getAverage} options={{ ...shaderPresets.heptapod, zoom: 1.2 }} />
    </div>
  );
};
