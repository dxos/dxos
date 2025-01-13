//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { TextToImage } from '../graph';

export const TextToImageShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('text-to-image'),
  }),
);

export type TextToImageShape = S.Schema.Type<typeof TextToImageShape>;

export type CreateTextToImageProps = CreateShapeProps<TextToImageShape>;

export const createTextToImage = ({ id, ...rest }: CreateTextToImageProps): TextToImageShape => ({
  id,
  type: 'text-to-image',
  size: { width: 128, height: 64 },
  ...rest,
});

export const TextToImageComponent = ({ shape }: ShapeComponentProps<TextToImageShape>) => {
  return <Box name={'Image Gen'}></Box>;
};

export const textToImageShape: ShapeDef<TextToImageShape> = {
  type: 'text-to-image',
  icon: 'ph--image--regular',
  component: TextToImageComponent,
  createShape: createTextToImage,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
