//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT, DefaultOutput, JsonTransformInput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { createFunctionAnchors, getHeight, Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { JsonFilter, createAnchorMap } from '../../components';
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

export type CreateJsonProps = CreateShapeProps<JsonShape> & { json?: any };

export const createJson = ({ id, json, size = { width: 256, height: 256 }, ...rest }: CreateJsonProps): JsonShape => ({
  id,
  type: 'json',
  size,
  ...rest,
});

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

export type CreateJsonTransformProps = CreateShapeProps<JsonTransformShape> & { json?: any };

export const createJsonTransform = ({
  id,
  json,
  size = { width: 128, height: getHeight(JsonTransformInput) },
  ...rest
}: CreateJsonTransformProps): JsonTransformShape => ({
  id,
  type: 'json-transform',
  size,
  ...rest,
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
