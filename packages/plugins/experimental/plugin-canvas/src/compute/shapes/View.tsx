//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
registerSignalsRuntime();

import { ComputeShape } from './defs';
import { createAnchors, TextBox, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { DEFAULT_INPUT, View } from '../graph';
import { Box } from './components';

export const ViewShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('view'),
  }),
);

export type ViewShape = ComputeShape<S.Schema.Type<typeof ViewShape>, View>;

export type CreateViewProps = Omit<ViewShape, 'type' | 'node' | 'size'>;

export const createView = ({ id, ...rest }: CreateViewProps): ViewShape => ({
  id,
  type: 'view',
  node: new View(),
  size: { width: 320, height: 512 },
  ...rest,
});

export const ViewComponent = ({ shape }: ShapeComponentProps<ViewShape>) => {
  let value = shape.node.state;

  if (typeof value !== 'string') {
    value = JSON.stringify(value, null, 2);
  }

  return (
    <Box name={'Artifact'}>
      <TextBox value={value} />
    </Box>
  );
};

export const viewShape: ShapeDef<ViewShape> = {
  type: 'view',
  icon: 'ph--eye--regular',
  component: ViewComponent,
  createShape: createView,
  getAnchors: (shape) =>
    createAnchors(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
    }),
};
