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
      {/* No card until the input has a value: an empty one is a bare frame with nothing in it. */}
      {value !== null && (
        // The shape's frame already frames it, so the card fills the body without a border of its own.
        <Card.Root grid border={false} classNames='dx-grow'>
          <Surface.Surface type={AppSurface.CardContent} data={{ subject: value }} limit={1} />
        </Card.Root>
      )}
    </Box>
  );
};
