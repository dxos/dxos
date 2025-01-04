//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useRef } from 'react';

import { S } from '@dxos/echo-schema';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { getAnchors } from './Function';
import { GptMessage } from './Gpt';
import { Box } from './components';
import { ComputeShape, createInputSchema, createOutputSchema } from './defs';
import { type ShapeComponentProps, type ShapeDef } from '../../components';
import { List } from '../graph';

const InputSchema = createInputSchema(GptMessage);
const OutputSchema = createOutputSchema(S.mutable(S.Array(GptMessage)));

export const ThreadShape = S.extend(
  ComputeShape,
  S.Struct({
    type: S.Literal('thread'),
  }),
);

export type ThreadShape = ComputeShape<S.Schema.Type<typeof ThreadShape>, List<any, any>>;

export type CreateThreadProps = Omit<ThreadShape, 'type' | 'node' | 'size'>;

export const createThread = ({ id, ...rest }: CreateThreadProps): ThreadShape => ({
  id,
  type: 'thread',
  node: new List(GptMessage),
  size: { width: 384, height: 768 },
  ...rest,
});

export const ThreadComponent = ({ shape }: ShapeComponentProps<ThreadShape>) => {
  const items = shape.node.items.value;
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  return (
    <Box name={'Thread'}>
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
  const { role, message } = item;
  return (
    <div className={mx('flex', classNames, role === 'user' && 'justify-end')}>
      <div
        className={mx(
          'block rounded-md p-1 px-2',
          role === 'user' ? 'bg-blue-200 dark:bg-blue-800' : 'whitespace-pre-wrap bg-neutral-200 dark:bg-neutral-800',
        )}
      >
        {message}
      </div>
    </div>
  );
};

export const threadShape: ShapeDef<ThreadShape> = {
  type: 'thread',
  icon: 'ph--chats-circle--regular',
  component: ThreadComponent,
  createShape: createThread,
  getAnchors: (shape) => getAnchors(shape, InputSchema, OutputSchema),
};
