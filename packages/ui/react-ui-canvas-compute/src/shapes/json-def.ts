//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { DefaultOutput, JsonTransformInput } from '@dxos/conductor';

import { createFunctionPorts, createPorts, defineComputeNode, getHeight } from './common/index.ts';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape, withZ } from './defs.ts';
import { JsonComponent, JsonTransformComponent } from './Json.tsx';

// Kept out of `Json.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

//
// Data
//

export const JsonShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('json'),
  }),
);

export type JsonShape = Schema.Schema.Type<typeof JsonShape>;

export const JsonTransformShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('json-transform'),
  }),
);

export type JsonTransformShape = Schema.Schema.Type<typeof JsonTransformShape>;

//
// Defs
//

export type CreateJsonProps = CreateShapeProps<JsonShape>;

export const createJson = (props: CreateJsonProps) =>
  createShape<JsonShape>({ type: 'json', size: { width: 256, height: 256 }, ...props });

export const jsonNodeDef = defineComputeNode<JsonShape>({
  type: 'json',
  name: 'JSON',
  icon: 'ph--code--regular',
  group: 'Outputs',
  schema: withZ(JsonShape),
  component: JsonComponent,
  create: createJson,
  ports: (shape) =>
    createPorts(shape.size, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
  resizable: true,
});

export type CreateJsonTransformProps = CreateShapeProps<JsonTransformShape> & { expression?: string };

export const createJsonTransform = (props: CreateJsonTransformProps) =>
  createShape<JsonTransformShape>({
    type: 'json-transform',
    size: { width: 128, height: getHeight(JsonTransformInput) },
    ...props,
  });

export const jsonTransformNodeDef = defineComputeNode<JsonTransformShape>({
  type: 'json-transform',
  name: 'Transform',
  icon: 'ph--shuffle-simple--regular',
  group: 'Operations',
  schema: withZ(JsonTransformShape),
  component: JsonTransformComponent,
  create: createJsonTransform,
  ports: (shape) => createFunctionPorts(shape.size, JsonTransformInput, DefaultOutput),
  resizable: true,
});
