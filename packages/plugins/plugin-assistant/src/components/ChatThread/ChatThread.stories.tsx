//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Effect, Layer } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { type ContentBlock, DataType } from '@dxos/schema';
import { ColumnContainer, render, withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { renderObjectLink } from './ChatMessage';
import { ChatThread, type ChatThreadProps } from './ChatThread';

faker.seed(1);

const StoryContainer = ({ delay = 0, ...props }: ChatThreadProps & { delay?: number }) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
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
      }).pipe(Effect.provide(Layer.mergeAll(DatabaseService.layer(space.db), ContextQueueService.layer(queue)))),
    );
  }, [space, queue]);

  if (!space) {
    return null;
  }

  return (
    <ChatThread {...props} space={space} messages={queue?.objects ?? []} onEvent={(event) => console.log(event)} />
  );
};

const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

const MESSAGES: Effect.Effect<void, never, DatabaseService | ContextQueueService>[] = [
  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('user', [
          {
            _tag: 'text',
            text: faker.lorem.sentence(5),
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
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
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    const { db } = yield* DatabaseService;
    const obj1 = db.add(Obj.make(DataType.Organization, { name: 'DXOS' }));
    const obj2 = db.add(Obj.make(DataType.Person, { fullName: 'Alice' }));
    const obj3 = db.add(Obj.make(DataType.Person, { fullName: 'Bob' }));
    const obj4 = db.add(Obj.make(DataType.Person, { fullName: 'Charlie' }));
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          // Inline tag.
          {
            _tag: 'text',
            text: [faker.lorem.paragraph(), renderObjectLink(obj1), faker.lorem.paragraph()].join(' '),
          },
          // Inline cards.
          ...[obj2, obj3, obj4].map(
            (obj) =>
              ({
                _tag: 'text',
                text: renderObjectLink(obj),
              }) satisfies ContentBlock.Text,
          ),
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: faker.lorem.paragraphs(1),
          },
          {
            _tag: 'toolkit',
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            disposition: 'cot',
            text: Array.from({ length: faker.number.int({ min: 3, max: 5 }) })
              .map((_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`)
              .join('\n'),
          },
          {
            _tag: 'toolCall',
            toolCallId: '1234',
            name: 'search',
            input: {},
          },
        ]),
        createMessage('user', [
          {
            _tag: 'toolResult',
            toolCallId: '1234',
            name: 'search',
            result: 'This is a tool result.',
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'toolCall',
            toolCallId: '4567',
            name: 'create',
            input: {},
          },
        ]),
        createMessage('user', [
          {
            _tag: 'toolResult',
            toolCallId: '4567',
            name: 'create',
            result: 'This is a tool result.',
          },
        ]),
        createMessage('assistant', [
          {
            _tag: 'text',
            text: Array.from({ length: faker.number.int({ min: 2, max: 3 }) })
              .map(() => faker.lorem.paragraphs())
              .join('\n\n'),
          },
        ]),
      ]),
    );
  }),

  Effect.gen(function* () {
    const { queue } = yield* ContextQueueService;
    yield* Effect.promise(() =>
      queue.append([
        createMessage('assistant', [
          {
            _tag: 'text',
            text: faker.lorem.paragraphs(2),
          },
        ]),
      ]),
    );
  }),
];

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  render: render(StoryContainer),
  decorators: [
    withClientProvider({
      createIdentity: true,
      types: [DataType.Organization, DataType.Person],
    }),
    withTheme,
    withLayout({
      Container: ColumnContainer,
      classNames: 'is-[40rem]',
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default = {} satisfies Story;

export const Delayed = {
  args: {
    delay: 2_000,
  },
} satisfies Story;
