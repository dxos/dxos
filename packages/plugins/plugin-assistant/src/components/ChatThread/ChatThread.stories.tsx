//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Context, Effect } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { type Queue, type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { type ContentBlock, DataType } from '@dxos/schema';
import { ColumnContainer, render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

faker.seed(1);

const StoryContainer = ({ delay = 0, ...props }: ChatThreadProps & { delay?: number }) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create<DataType.Message>().dxn, [space]);
  const queue = useQueue<DataType.Message>(queueDxn);
  useEffect(() => {
    if (!space || !queue) {
      return;
    }

    void Effect.runPromise(
      Effect.gen(function* () {
        for (const step of MESSAGES) {
          yield* step;
          yield* Effect.sleep(delay);
        }

        return queue;
      }).pipe(Effect.provide(Context.make(TestQueue, TestQueue.make(space, queue)))),
    );
  }, [space, queue]);

  if (!space) {
    return null;
  }

  return <ChatThread {...props} space={space} messages={queue?.objects ?? []} />;
};

const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

export class TestQueue extends Context.Tag('@dxos/test/TestQueue')<
  TestQueue,
  {
    space: Space;
    queue: Queue<DataType.Message>;
  }
>() {
  static make = (space: Space, queue: Queue<DataType.Message>): Context.Tag.Service<TestQueue> => {
    return {
      space,
      queue,
    };
  };
}

const MESSAGES: Effect.Effect<void, never, TestQueue>[] = [
  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('user', [
        {
          _tag: 'text',
          text: faker.lorem.sentence(5),
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue, space } = yield* TestQueue;
    const obj = space.db.add(Obj.make(DataType.Organization, { name: 'DXOS' }));
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'text',
          text: `this is [${obj.name}](${Obj.getDXN(obj).toString()}).`,
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'suggest',
          text: 'Search...',
        },
        {
          _tag: 'suggest',
          text: faker.lorem.paragraphs(1),
        },
      ]),
      createMessage('assistant', [
        {
          _tag: 'text',
          text: 'Select an option:',
        },
        {
          _tag: 'select',
          options: ['Option 1', 'Option 2', 'Option 3'],
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'text',
          text: faker.lorem.paragraphs(1),
        },
        {
          _tag: 'toolkit',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'text',
          disposition: 'cot',
          text: Array.from({ length: faker.number.int({ min: 3, max: 5 }) })
            .map((_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`)
            .join('\n'),
        },
        {
          _tag: 'text',
          text: Array.from({ length: faker.number.int({ min: 2, max: 5 }) })
            .map(() => faker.lorem.paragraphs())
            .join('\n\n'),
        },
        {
          _tag: 'toolCall',
          toolCallId: '1234',
          name: 'search',
          input: {},
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('user', [
        {
          _tag: 'toolResult',
          toolCallId: '1234',
          name: 'search',
          result: 'This is a tool result.',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'toolCall',
          toolCallId: '4567',
          name: 'create',
          input: {},
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('user', [
        {
          _tag: 'toolResult',
          toolCallId: '4567',
          name: 'create',
          result: 'This is a tool result.',
        },
      ]),
    ]);
  }),

  Effect.gen(function* () {
    const { queue } = yield* TestQueue;
    return queue.append([
      createMessage('assistant', [
        {
          _tag: 'text',
          text: faker.lorem.paragraphs(1),
        },
      ]),
    ]);
  }),
];

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  render: render(StoryContainer),
  decorators: [
    withClientProvider({
      createIdentity: true,
      types: [DataType.Organization],
    }),
    withTheme,
    withLayout({
      Container: ColumnContainer,
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {
  args: {
    onEvent: (event) => console.log(event),
  },
} satisfies Story;
