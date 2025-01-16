//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { JsonFilter, createAnchorMap } from '../../components';
import { DEFAULT_INPUT } from '../graph';
import { useComputeNodeState } from '../hooks';

//
// Data
//

export const JsonShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('json'),
  }),
);

export type JsonShape = S.Schema.Type<typeof JsonShape>;

//
// Component
//

export type JsonComponentProps = ShapeComponentProps<JsonShape>;

export const JsonComponent = ({ shape, ...props }: JsonComponentProps) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : undefined;

  return (
    <Box name={'Json'}>
      <JsonFilter data={value} classNames='text-xs' />
    </Box>
  );
};

//
// Defs
//

export type CreateJsonProps = CreateShapeProps<JsonShape> & { json?: any };

export const createJson = ({ id, json, size = { width: 256, height: 256 }, ...rest }: CreateJsonProps): JsonShape => ({
  id,
  type: 'json',
  size,
  ...rest,
});

export const jsonShape: ShapeDef<JsonShape> = {
  type: 'json',
  icon: 'ph--code--regular',
  component: (props) => <JsonComponent {...props} />,
  createShape: createJson,
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
  resizeable: true,
};
