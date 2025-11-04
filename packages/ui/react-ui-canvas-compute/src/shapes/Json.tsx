//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { DEFAULT_INPUT, DefaultOutput, JsonTransformInput } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

import { useComputeNodeState } from '../hooks';

import { Box, createFunctionAnchors, getHeight } from './common';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

//
// Data
//

export const JsonShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('json'),
  }),
);

export type JsonShape = Schema.Schema.Type<typeof JsonShape>;

export const JsonTransformShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('json-transform'),
  }),
);

export type JsonTransformShape = Schema.Schema.Type<typeof JsonTransformShape>;

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
      <JsonFilter data={value} classNames='text-xs' />
    </Box>
  );
};

export type JsonTransformComponentProps = ShapeComponentProps<JsonTransformShape>;

export const JsonTransformComponent = ({ shape, ...props }: JsonTransformComponentProps) => <Box shape={shape} />;

//
// Defs
//

export type CreateJsonProps = CreateShapeProps<JsonShape>;

export const createJson = (props: CreateJsonProps) =>
  createShape<JsonShape>({ type: 'json', size: { width: 256, height: 256 }, ...props });

export const jsonShape: ShapeDef<JsonShape> = {
  type: 'json',
  name: 'JSON',
  icon: 'ph--code--regular',
  component: (props) => <JsonComponent {...props} />,
  createShape: createJson,
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
  resizable: true,
};

export type CreateJsonTransformProps = CreateShapeProps<JsonTransformShape> & { expression?: string };

export const createJsonTransform = (props: CreateJsonTransformProps) =>
  createShape<JsonTransformShape>({
    type: 'json-transform',
    size: { width: 128, height: getHeight(JsonTransformInput) },
    ...props,
  });

export const jsonTransformShape: ShapeDef<JsonTransformShape> = {
  type: 'json-transform',
  name: 'Transform',
  icon: 'ph--shuffle-simple--regular',
  component: (props) => <JsonTransformComponent {...props} />,
  createShape: createJsonTransform,
  getAnchors: (shape) => createFunctionAnchors(shape, JsonTransformInput, DefaultOutput),
  resizable: true,
};
