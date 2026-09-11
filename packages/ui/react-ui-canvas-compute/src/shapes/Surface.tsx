//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { DEFAULT_INPUT } from '@dxos/conductor';
import { Card } from '@dxos/react-ui';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box, type BoxActionHandler } from './common/index.ts';
import { type SurfaceShape } from './surface-def.ts';

export const SurfaceComponent = ({ shape }: ShapeComponentProps<SurfaceShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : null;

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  // TODO(burdon): Subject property?
  return (
    <Box shape={shape} onAction={handleAction}>
      <Card.Root>
        {value !== null && <Surface.Surface type={AppSurface.CardContent} data={{ subject: value }} limit={1} />}
      </Card.Root>
    </Box>
  );
};
