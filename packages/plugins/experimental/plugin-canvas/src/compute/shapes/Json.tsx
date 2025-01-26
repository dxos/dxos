//
// Copyright 2024 DXOS.org
//

import React, { useRef } from 'react';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import {
  TextBox,
  type TextBoxControl,
  type ShapeComponentProps,
  type ShapeDef,
  type TextBoxProps,
} from '../../components';
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
  const { node, runtime } = useComputeNodeState(shape);
  const inputRef = useRef<TextBoxControl>(null);

  const handleEnter: TextBoxProps['onEnter'] = (text) => {
    runtime.setOutput(DEFAULT_OUTPUT, text);
    inputRef.current?.focus();
  };

  return (
    <Box shape={shape}>
      <TextBox ref={inputRef} value={node.value} onEnter={handleEnter} placeholder='JSONPath expression.' />
    </Box>
  );
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
  size = { width: 256, height: 128 },
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
  getAnchors: (shape) =>
    createAnchorMap(shape, {
      [createAnchorId('input')]: { x: -1, y: 0 },
      [createAnchorId('output')]: { x: 1, y: 0 },
    }),
  resizable: true,
};
