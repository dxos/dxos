//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps } from '@dxos/react-ui-canvas-editor';
import { Syntax } from '@dxos/react-ui-syntax-highlighter';

import { useComputeNodeState } from '../hooks/index.ts';
import { Box } from './common/index.ts';
import { type JsonShape, type JsonTransformShape } from './json-def.ts';

//
// Component
//

export type JsonComponentProps = ShapeComponentProps<JsonShape>;

export const JsonComponent = ({ shape, ...props }: JsonComponentProps) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : undefined;

  return (
    <Box shape={shape}>
      <Syntax.Root data={value}>
        <Syntax.Content>
          <Syntax.Filter />
          <Syntax.Viewport>
            <Syntax.Code classNames='text-xs' />
          </Syntax.Viewport>
        </Syntax.Content>
      </Syntax.Root>
    </Box>
  );
};

export type JsonTransformComponentProps = ShapeComponentProps<JsonTransformShape>;

export const JsonTransformComponent = ({ shape, ...props }: JsonTransformComponentProps) => {
  return <Box shape={shape} />;
};
