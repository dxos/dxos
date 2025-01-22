//
// Copyright 2024 DXOS.org
//

import React, { Fragment } from 'react';

import { ListInput, ListOutput } from '@dxos/conductor';
import { S } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { createFunctionAnchors } from './common';
import { Box, type BoxActionHandler } from './common';
import { ComputeShape, type CreateShapeProps } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { useComputeNodeState } from '../hooks';

export const ListShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('list'),
  }),
);

export type ListShape = S.Schema.Type<typeof ListShape>;

export type CreateListProps = CreateShapeProps<ListShape>;

export const createList = ({ id, ...rest }: CreateListProps): ListShape => ({
  id,
  type: 'list',
  size: { width: 256, height: 512 },
  ...rest,
});

export const ListComponent = ({ shape }: ShapeComponentProps<ListShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const items = runtime.outputs.items?.type === 'executed' ? runtime.outputs.items.value : [];

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} status={`${items.length} items`} onAction={handleAction}>
      <div className='flex flex-col w-full overflow-y-scroll divide-y divide-separator'>
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
          <div>{typeof value === 'string' ? value : JSON.stringify(value)}</div>
        </Fragment>
      ))}
    </div>
  );
};

export const listShape: ShapeDef<ListShape> = {
  type: 'list',
  name: 'List',
  icon: 'ph--list-dashes--regular',
  component: ListComponent,
  createShape: createList,
  getAnchors: (shape) => createFunctionAnchors(shape, ListInput, ListOutput),
  resizable: true,
};
