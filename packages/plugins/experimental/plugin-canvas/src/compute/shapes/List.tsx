//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { S } from '@dxos/echo-schema';

import { getAnchors } from './Function';
import { GptMessage } from './Gpt';
import { ComputeShape, createInputSchema, createOutputSchema } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { List } from '../graph';

const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const ListShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('list'),
  }),
);

export type ListShape = ComputeShape<S.Schema.Type<typeof ListShape>, List<any, any>>;

export type CreateListProps = Omit<ListShape, 'type' | 'node' | 'size'>;

export const createList = ({ id, ...rest }: CreateListProps): ListShape => ({
  id,
  type: 'list',
  node: new List(GptMessage),
  size: { width: 256, height: 512 },
  ...rest,
});

export const ListComponent = ({ shape }: ShapeComponentProps<ListShape>) => {
  const items = shape.node.items.value;

  // TODO(burdon): Doesn't scroll.
  return (
    <div className='flex flex-col w-full h-full overflow-hidden'>
      <div className='flex flex-col w-full overflow-y-scroll divide-y divide-separator'>
        {[...items].reverse().map((item, i) => (
          <div key={i} className='p-1 px-2'>
            {JSON.stringify(item)}
          </div>
        ))}
      </div>
    </div>
  );
};

export const listShape: ShapeDef<ListShape> = {
  type: 'list',
  icon: 'ph--list-dashes--regular',
  component: ListComponent,
  createShape: createList,
  getAnchors: (shape) => getAnchors(shape, InputSchema, OutputSchema),
};
