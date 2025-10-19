//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { DEFAULT_INPUT } from '@dxos/conductor';
import { type ShapeComponentProps, type ShapeDef, TextBox } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { useComputeNodeState } from '../hooks';

import { Box, type BoxActionHandler } from './common';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const TextShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('text'),
  }),
);

export type TextShape = Schema.Schema.Type<typeof TextShape>;

export type CreateTextProps = CreateShapeProps<TextShape>;

export const createText = (props: CreateTextProps) =>
  createShape<TextShape>({ type: 'text', size: { width: 384, height: 384 }, ...props });

export const TextComponent = ({ shape }: ShapeComponentProps<TextShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} onAction={handleAction}>
      <TextBox value={value} />
    </Box>
  );
};

export const textShape: ShapeDef<TextShape> = {
  type: 'text',
  name: 'Text',
  icon: 'ph--article--regular',
  component: TextComponent,
  createShape: createText,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
};
