//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { DEFAULT_INPUT } from '@dxos/conductor';
import * as Card from '@dxos/react-ui/Card';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, type ComputeNodeViewProps } from './common/index.ts';
import { type SurfaceShape } from './surface-def.ts';

export const SurfaceComponent = ({ node: shape }: ComputeNodeViewProps<SurfaceShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : null;

  // TODO(burdon): Subject property?
  return (
    <Box shape={shape}>
      <Card.Root grid>
        {value !== null && <Surface.Surface type={AppSurface.CardContent} data={{ subject: value }} limit={1} />}
      </Card.Root>
    </Box>
  );
};
