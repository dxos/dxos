//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Surface } from '@dxos/app-framework';
import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { Box, type BoxActionHandler } from './common';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const SurfaceShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('surface'),
  }),
);

export type SurfaceShape = Schema.Schema.Type<typeof SurfaceShape>;

export type CreateSurfaceProps = CreateShapeProps<SurfaceShape>;

export const createSurface = (props: CreateSurfaceProps) =>
  createShape<SurfaceShape>({ type: 'surface', size: { width: 384, height: 384 }, ...props });

export const SurfaceComponent = ({ shape }: ShapeComponentProps<SurfaceShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : null;

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} onAction={handleAction}>
      {value !== null && <Surface role='card--extrinsic' data={{ value }} limit={1} />}
    </Box>
  );
};

export const surfaceShape: ShapeDef<SurfaceShape> = {
  type: 'surface',
  name: 'Surface',
  icon: 'ph--frame-corners--regular',
  component: SurfaceComponent,
  createShape: createSurface,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
};
