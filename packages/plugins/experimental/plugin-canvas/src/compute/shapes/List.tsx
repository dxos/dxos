//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useRef } from 'react';

import { S } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { createFunctionAnchors } from './Function';
import { Box } from './components';
import { ComputeShape, createInputSchema, createOutputSchema, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { GptMessage, List } from '../graph';

// TODO(burdon): Type-specific.
const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const ListShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('list'),
  }),
);

export type ListShape = ComputeShape<S.Schema.Type<typeof ListShape>, List<any>>;

export type CreateListProps = CreateShapeProps<ListShape> & { onlyLast?: boolean };

export const createList = ({ id, onlyLast, ...rest }: CreateListProps): ListShape => ({
  id,
  type: 'list',
  node: new List(GptMessage, { onlyLast }),
  size: { width: 256, height: 512 },
  ...rest,
});

export const ListComponent = ({ shape }: ShapeComponentProps<ListShape>) => {
  const items = shape.node.items.value;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <Box name={'List'}>
      <div ref={ref} className='flex flex-col w-full overflow-y-scroll divide-y divide-separator'>
        {[...items].map((item, i) => (
          <ListItem key={i} classNames='p-1 px-2' item={item} />
        ))}
      </div>
    </Box>
  );
};

export const ListItem = ({ classNames, item }: ThemedClassName<{ item: any }>) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames, 'whitespace-pre-wrap')}>{item}</div>;
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
  getAnchors: (shape) => createFunctionAnchors(shape, InputSchema, OutputSchema),
  resizeable: true,
};
