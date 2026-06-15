//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { Fragment } from 'react';

import { DEFAULT_OUTPUT, QueueInput, QueueOutput } from '@dxos/conductor';
import { ScrollArea, type ThemedClassName } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/ui-theme';

import { useComputeNodeState } from '../hooks';
import { createFunctionAnchors } from './common';
import { Box, type BoxActionHandler } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

export const FeedShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('queue'),
  }),
);

export type FeedShape = Schema.Schema.Type<typeof FeedShape>;

export type CreateFeedProps = CreateShapeProps<FeedShape>;

export const createFeed = (props: CreateFeedProps) =>
  createShape<FeedShape>({
    type: 'queue',
    size: { width: 256, height: 512 },
    ...props,
  });

export const FeedComponent = ({ shape }: ShapeComponentProps<FeedShape>) => {
  const { runtime } = useComputeNodeState(shape);
  const items = runtime.outputs[DEFAULT_OUTPUT]?.type === 'executed' ? runtime.outputs[DEFAULT_OUTPUT].value : [];

  const handleAction: BoxActionHandler = (action) => {
    if (action === 'run') {
      runtime.evalNode();
    }
  };

  return (
    <Box shape={shape} status={`${items.length} items`} onAction={handleAction}>
      <ScrollArea.Root orientation='vertical'>
        <ScrollArea.Viewport classNames='divide-y divide-separator'>
          {[...items].map((item, i) => (
            <FeedItem key={i} classNames='p-1 px-2' item={item} />
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Box>
  );
};

export const FeedItem = ({ classNames, item }: ThemedClassName<{ item: any }>) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames, 'whitespace-pre-wrap')}>{item}</div>;
  }

  return (
    <div className={mx('grid grid-cols-[80px_1fr]', classNames)}>
      {Object.entries(item).map(([key, value]) => (
        <Fragment key={key}>
          <div className='p-1 text-xs text-subdued'>{key}</div>
          <div>{typeof value === 'string' ? value : JSON.stringify(value)}</div>
        </Fragment>
      ))}
    </div>
  );
};

export const feedShape: ShapeDef<FeedShape> = {
  type: 'feed',
  name: 'Feed',
  icon: 'ph--queue--regular',
  component: FeedComponent,
  createShape: createFeed,
  getAnchors: (shape) => createFunctionAnchors(shape, QueueInput, QueueOutput),
  resizable: true,
};
