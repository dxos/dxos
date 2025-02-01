//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT, DefaultOutput, JsonTransformInput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';

import { createFunctionAnchors, getHeight, Box } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
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

export const JsonTransformShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('json-transform'),
  }),
);

export type JsonTransformShape = S.Schema.Type<typeof JsonTransformShape>;

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

export const JsonTransformComponent = ({ shape, ...props }: JsonTransformComponentProps) => {
  return <Box shape={shape} />;
};

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
