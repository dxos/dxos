//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { DEFAULT_INPUT, isImage } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';

import { Box, type BoxActionHandler } from './common';
import { ComputeShape, createAnchorId, createShape, type CreateShapeProps } from './defs';
import { TextBox, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { useComputeNodeState } from '../hooks';

export const TextShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('text'),
  }),
);

export type TextShape = S.Schema.Type<typeof TextShape>;

export type CreateTextProps = CreateShapeProps<TextShape>;

export const createText = (props: CreateTextProps) =>
  createShape<TextShape>({ type: 'text', size: { width: 320, height: 512 }, ...props });

export const TextComponent = ({ shape }: ShapeComponentProps<TextShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

  if (isImage(value)) {
    return (
      <Box shape={shape}>
        {(value.source && (
          <img
            className='grow object-cover'
            src={`data:image/jpeg;base64,${value.source.data}`}
            alt={value.prompt ?? `Generated image [id=${value.id}]`}
          />
        )) || (
          <div className='p-2'>
            Unresolved image of {value.prompt} [id={value.id}]
          </div>
        )}
      </Box>
    );
  }

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
