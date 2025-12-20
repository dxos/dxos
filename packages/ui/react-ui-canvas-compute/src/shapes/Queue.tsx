//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { Fragment } from 'react';

import { DEFAULT_OUTPUT, QueueInput, QueueOutput } from '@dxos/conductor';
import { type ThemedClassName } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/react-ui-theme';

import { useComputeNodeState } from '../hooks';

import { createFunctionAnchors } from './common';
import { Box, type BoxActionHandler } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const QueueShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('queue'),
  }),
);

export type QueueShape = Schema.Schema.Type<typeof QueueShape>;

export type CreateQueueProps = CreateShapeProps<QueueShape>;

export const createQueue = (props: CreateQueueProps) =>
  createShape<QueueShape>({
    type: 'queue',
    size: { width: 256, height: 512 },
    ...props,
  });

export const QueueComponent = ({ shape }: ShapeComponentProps<QueueShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const items = runtime.outputs[DEFAULT_OUTPUT]?.type === 'executed' ? runtime.outputs[DEFAULT_OUTPUT].value : [];

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} status={`${items.length} items`} onAction={handleAction}>
      <div className='flex flex-col is-full overflow-y-auto divide-y divide-separator'>
        {[...items].map((item, i) => (
          <QueueItem key={i} classNames='p-1 pli-2' item={item} />
        ))}
      </div>
    </Box>
  );
};

export const QueueItem = ({ classNames, item }: ThemedClassName<{ item: any }>) => {
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

export const queueShape: ShapeDef<QueueShape> = {
  type: 'queue',
  name: 'Queue',
  icon: 'ph--queue--regular',
  component: QueueComponent,
  createShape: createQueue,
  getAnchors: (shape) => createFunctionAnchors(shape, QueueInput, QueueOutput),
  resizable: true,
};
