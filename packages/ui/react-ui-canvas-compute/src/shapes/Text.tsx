//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, type ComputeNodeViewProps, TextBox } from './common/index.ts';
import { type TextShape } from './text-def.ts';

export const TextComponent = ({ node: shape }: ComputeNodeViewProps<TextShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

  return (
    <Box shape={shape}>
      <TextBox value={value} />
    </Box>
  );
};
