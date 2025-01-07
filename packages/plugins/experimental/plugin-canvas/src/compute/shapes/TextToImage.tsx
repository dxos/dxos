//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape, type CreateShapeProps } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { DEFAULT_OUTPUT, TextToImage } from '../graph';

export const TextToImageShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('textToImage'),
  }),
);

export type TextToImageShape = ComputeShape<S.Schema.Type<typeof TextToImageShape>, TextToImage>;

export type CreateTextToImageProps = CreateShapeProps<TextToImageShape>;

export const createTextToImage = ({ id, ...rest }: CreateTextToImageProps): TextToImageShape => ({
  id,
  type: 'textToImage',
  node: new TextToImage(),
  size: { width: 128, height: 64 },
  ...rest,
});

export const TextToImageComponent = ({ shape }: ShapeComponentProps<TextToImageShape>) => {
  return <Box name={'TextToImage'}></Box>;
};

export const textToImageShape: ShapeDef<TextToImageShape> = {
  type: 'textToImage',
  icon: 'ph--image--regular',
  component: TextToImageComponent,
  createShape: createTextToImage,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
