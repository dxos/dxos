//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './components';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { TextBox, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { View } from '../graph';

export const ViewShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('view'),
  }),
);

export type ViewShape = S.Schema.Type<typeof ViewShape>;

export type CreateViewProps = CreateShapeProps<ViewShape>;

export const createView = ({ id, ...rest }: CreateViewProps): ViewShape => ({
  id,
  type: 'view',
  size: { width: 320, height: 512 },
  ...rest,
});

export const ViewComponent = ({ shape }: ShapeComponentProps<ViewShape>) => {
  let value = shape.node.state;
  if (typeof value !== 'string') {
    value = JSON.stringify(value, null, 2);
  }

  const imageMatch = (value as string)?.match(/<image id="([^"]+)"(?:\s+prompt="([^"]+)")?\s*\/>/);
  if (imageMatch) {
    const [, id, prompt] = imageMatch;
    const image = shape.node.resolveImage(id);
    if (image?.source) {
      return (
        <Box name={'Artifact'}>
          <img
            src={`data:image/jpeg;base64,${image.source.data}`}
            className='grow object-cover'
            alt={prompt || 'Generated image'}
          />
        </Box>
      );
    } else {
      value += 'image not found.';
    }
  }

  return (
    <Box name={'Artifact'}>
      <TextBox value={value} />
    </Box>
  );
};

export const viewShape: ShapeDef<ViewShape> = {
  type: 'view',
  icon: 'ph--eye--regular',
  component: ViewComponent,
  createShape: createView,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizeable: true,
};
