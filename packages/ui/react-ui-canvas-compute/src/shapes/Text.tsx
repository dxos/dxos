//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps, TextBox } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, type BoxActionHandler } from './common/index.ts';
import { type TextShape } from './text-def.ts';

export const TextComponent = ({ shape }: ShapeComponentProps<TextShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} onAction={handleAction}>
      <TextBox value={value} />
    </Box>
  );
};
