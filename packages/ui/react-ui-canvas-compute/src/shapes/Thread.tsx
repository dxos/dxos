//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import React, { useEffect, useRef } from 'react';

import { createInputSchema, createOutputSchema } from '@dxos/conductor';
import { type ThemedClassName } from '@dxos/react-ui';
import { type ShapeComponentProps, type ShapeDef } from '@dxos/react-ui-canvas-editor';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';

import { Box, createFunctionAnchors } from './common';
import { ComputeShape, type CreateShapeProps, createShape } from './defs';

const InputSchema = createInputSchema(DataType.Message);
const OutputSchema = createOutputSchema(Schema.mutable(Schema.Array(DataType.Message)));

export const ThreadShape = Schema.extend(
  ComputeShape,
  Schema.Struct({
    type: Schema.Literal('thread'),
  }),
);

export type ThreadShape = Schema.Schema.Type<typeof ThreadShape>;

export type CreateThreadProps = CreateShapeProps<ThreadShape>;

export const createThread = (props: CreateThreadProps) =>
  createShape<ThreadShape>({ type: 'thread', size: { width: 384, height: 384 }, ...props });

export const ThreadComponent = ({ shape }: ShapeComponentProps<ThreadShape>) => {
  const items: any[] = [];
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <Box shape={shape}>
      <div ref={scrollRef} className='flex flex-col w-full overflow-y-scroll gap-2 p-2'>
        {[...items].map((item, i) => (
          <ThreadItem key={i} item={item} />
        ))}
      </div>
    </Box>
  );
};

export const ThreadItem = ({ classNames, item }: ThemedClassName<{ item: any }>) => {
  if (typeof item !== 'object') {
    return <div className={mx(classNames)}>{item}</div>;
  }

  // TODO(burdon): Hack; introspect type.
  // TODO(burdon): Markdown parser.
  const { role, message } = item;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div
        className={mx(
          'block rounded-md p-1 px-2 text-sm',
          role === 'user'
            ? 'bg-blue-100 dark:bg-blue-800'
            : role === 'system'
              ? 'bg-red-100, dark:bg-red-800'
              : 'whitespace-pre-wrap bg-neutral-50 dark:bg-neutral-800',
        )}
      >
        {message}
      </div>
    </div>
  );
};

export const threadShape: ShapeDef<ThreadShape> = {
  type: 'thread',
  name: 'Thread',
  icon: 'ph--chats-circle--regular',
  component: ThreadComponent,
  createShape: createThread,
  getAnchors: (shape) => createFunctionAnchors(shape, InputSchema, OutputSchema),
  resizable: true,
};
