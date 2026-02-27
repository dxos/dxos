//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';
import { Card } from '@dxos/react-ui-mosaic';

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
  createShape<SurfaceShape>({
    type: 'surface',
    size: { width: 384, height: 384 },
    ...props,
  });

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
      <Card.Root>{value !== null && <Surface.Surface role='card--content' data={{ value }} limit={1} />}</Card.Root>
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
