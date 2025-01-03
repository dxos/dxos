//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { S } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

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
  size: { width: 320, height: 512 },
  ...rest,
});

export const ListComponent = ({ shape }: ShapeComponentProps<ListShape>) => {
  const items = shape.node.items.value;

  // TODO(burdon): Doesn't scroll.
  return (
    <div className='flex flex-col w-full h-full overflow-hidden'>
      <div className='flex flex-col w-full overflow-y-scroll divide-y divide-separator'>
        {[...items].reverse().map((item, i) => (
          <ListItem key={i} classNames='p-1 px-2' item={item} />
        ))}
      </div>
    </div>
  );
};

export const ListItem = ({ classNames, item }: ThemedClassName<{ item: any }>) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames)}>{item}</div>;
  }

  return (
    <div className={mx('grid grid-cols-[80px,1fr]', classNames)}>
      {Object.entries(item).map(([key, value]) => (
        <Fragment key={key}>
          <div className='p-1 text-xs text-subdued'>{key}</div>
          <div>{String(value)}</div>
        </Fragment>
      ))}
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
