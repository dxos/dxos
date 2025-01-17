//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { Box } from './common';
import { ComputeShape, createAnchorId, type CreateShapeProps } from './defs';
import { TextBox, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorMap } from '../../components';
import { DEFAULT_INPUT } from '../graph/types';
import { useComputeNodeState } from '../hooks';
import { isImage } from '@dxos/conductor';

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
  const { runtime } = useComputeNodeState(shape);
  const input = runtime.inputs[DEFAULT_INPUT];
  const value = input?.type === 'executed' ? input.value : 0;

  if (isImage(value)) {
    if (value.source) {
      return (
        <Box shape={shape}>
          <img
            src={`data:image/jpeg;base64,${value.source.data}`}
            className='grow object-cover'
            alt={value.prompt ?? `Generated image [id=${value.id}]`}
          />
        </Box>
      );
    } else {
      return (
        <Box shape={shape}>
          Unresolved image of {value.prompt} [id={value.id}]
        </Box>
      );
    }
  }

  return (
    <Box shape={shape}>
      <TextBox value={value} />
    </Box>
  );
};

export const viewShape: ShapeDef<ViewShape> = {
  type: 'view',
  name: 'View',
  icon: 'ph--eye--regular',
  component: ViewComponent,
  createShape: createView,
  getAnchors: (shape) => createAnchorMap(shape, { [createAnchorId('input')]: { x: -1, y: 0 } }),
  resizable: true,
};
