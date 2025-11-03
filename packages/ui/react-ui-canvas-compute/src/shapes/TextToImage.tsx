//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { Box } from './common';
import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs';

export const TextToImageShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('text-to-image'),
  }),
);

export type TextToImageShape = Schema.Schema.Type<typeof TextToImageShape>;

export type CreateTextToImageProps = CreateShapeProps<TextToImageShape>;

export const createTextToImage = (props: CreateTextToImageProps) =>
  createShape<TextToImageShape>({ type: 'text-to-image', size: { width: 128, height: 64 }, ...props });

export const TextToImageComponent = ({ shape }: ShapeComponentProps<TextToImageShape>) => <Box shape={shape} />;

export const textToImageShape: ShapeDef<TextToImageShape> = {
  type: 'text-to-image',
  name: 'Image',
  icon: 'ph--image--regular',
  component: TextToImageComponent,
  createShape: createTextToImage,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
