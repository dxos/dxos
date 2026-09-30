//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { createAnchorMap } from '@dxos/react-ui-canvas-editor';

import { ComputeShape, type CreateShapeProps, createAnchorId, createShape } from './defs.ts';
import { TextToImageComponent } from './TextToImage.tsx';

// Kept out of `TextToImage.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

export const TextToImageShape = ComputeShape.mapFields(
  Struct.assign({
    type: Schema.Literal('text-to-image'),
  }),
);

export type TextToImageShape = Schema.Schema.Type<typeof TextToImageShape>;

export type CreateTextToImageProps = CreateShapeProps<TextToImageShape>;

export const createTextToImage = (props: CreateTextToImageProps) =>
  createShape<TextToImageShape>({ type: 'text-to-image', size: { width: 128, height: 64 }, ...props });

export const textToImageShape: ShapeDef<TextToImageShape> = {
  type: 'text-to-image',
  name: 'Image',
  icon: 'ph--image--regular',
  component: TextToImageComponent,
  createShape: createTextToImage,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
