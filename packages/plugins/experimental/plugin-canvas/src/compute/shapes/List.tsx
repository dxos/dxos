//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { ComputeShape } from './defs';
import { createAnchors, type ShapeComponentProps, type ShapeDef } from '../../components';
import { createAnchorId } from '../../shapes';
import { List } from '../graph';

export const ListShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('list'),
  }),
);

export type ListShape = ComputeShape<S.Schema.Type<typeof ListShape>, List>;

export type CreateListProps = Omit<ListShape, 'type' | 'node' | 'size'>;

export const createList = ({ id, ...rest }: CreateListProps): ListShape => ({
  id,
  type: 'list',
  node: new List(),
  size: { width: 256, height: 128 },
  ...rest,
});

export const ListComponent = ({ shape }: ShapeComponentProps<ListShape>) => {
  return <div className='flex w-full h-full p-2'></div>;
};

export const listShape: ShapeDef<ListShape> = {
  type: 'list',
  icon: 'ph--list-dashes--regular',
  component: ListComponent,
  createShape: createList,
  getAnchors: (shape) => createAnchors(shape, { [createAnchorId('output')]: { x: 1, y: 0 } }),
};
