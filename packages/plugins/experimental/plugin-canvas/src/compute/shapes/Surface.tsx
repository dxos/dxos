//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework';
import { DEFAULT_INPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { Box, type BoxActionHandler } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeNodeState } from '../hooks';

export const SurfaceShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('surface'),
  }),
);

export type SurfaceShape = S.Schema.Type<typeof SurfaceShape>;

export type CreateSurfaceProps = CreateShapeProps<SurfaceShape>;

export const createSurface = (props: CreateSurfaceProps) =>
  createShape<SurfaceShape>({ type: 'surface', size: { width: 384, height: 384 }, ...props });

export const SurfaceComponent = ({ shape }: ShapeComponentProps<SurfaceShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value =
    input?.type === 'executed' ? input.value : 'r1k4r/p2nb1p1/2b4p/1p1n1p2/2PP4/3Q1NB1/1P3PPP/R5K1 b - c3 0 19';

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} onAction={handleAction}>
      {value !== null && <Surface role='canvas-node' data={{ value }} />}
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
