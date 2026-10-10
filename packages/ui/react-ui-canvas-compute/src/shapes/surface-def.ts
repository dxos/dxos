//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { createPorts, defineComputeNode } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
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

export const surfaceNodeDef = defineComputeNode<SurfaceShape>({
  type: 'surface',
  name: 'Surface',
  icon: 'ph--frame-corners--regular',
  group: 'Outputs',
  schema: withZ(SurfaceShape),
  component: SurfaceComponent,
  create: createSurface,
  ports: (shape) => createPorts(shape.size, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
});
