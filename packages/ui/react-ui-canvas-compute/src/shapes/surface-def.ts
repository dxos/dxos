//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';
import { SurfaceComponent } from './Surface.tsx';

// Kept out of `Surface.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const SurfaceShape = ComputeShape.mapFields(
  Struct.assign({
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

export const surfaceShape: ShapeDef<SurfaceShape> = {
  type: 'surface',
  name: 'Surface',
  icon: 'ph--frame-corners--regular',
  component: SurfaceComponent,
  createShape: createSurface,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
};
