//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Effect, Layer } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { defaultTx, mx } from '@dxos/react-ui-theme';
import { type ContentBlock, DataType } from '@dxos/schema';
import { render, withLayout } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { renderObjectLink } from './ChatMessage';
import { ChatThread, type ChatThreadProps, useMarkdownText } from './ChatThread';

faker.seed(1);

type MessageGenerator = Effect.Effect<void, never, DatabaseService | ContextQueueService>;

type StoryProps = ChatThreadProps & { generator?: MessageGenerator[]; delay?: number; debug?: boolean };

const DefaultStory = ({ generator = [], delay = 0, debug = false, ...props }: StoryProps) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
  const queue = useQueue<DataType.Message>(queueDxn);
  useEffect(() => {
    if (!space || !queue) {
      return;
    }

    void Effect.runPromise(
      Effect.gen(function* () {
        for (const step of generator) {
          yield* step;
          if (delay) {
            yield* Effect.sleep(delay);
          }
        }

        return queue;
      }).pipe(Effect.provide(Layer.mergeAll(DatabaseService.layer(space.db), ContextQueueService.layer(queue)))),
    );
  }, [space, queue, generator]);

  const raw = useMarkdownText(queue?.objects ?? []);

  return (
    <div className={mx('grid divide-x divide-separator bs-full is-full', debug && 'grid-cols-2')}>
      <ChatThread {...props} messages={queue?.objects ?? []} onEvent={(event) => console.log(event)} />
      {debug && (
        <div className='p-2 overflow-y-auto'>
          <pre className='text-xs text-subdued'>{raw}</pre>
        </div>
      )}
    </div>
  );
};

const createMessage = (role: DataType.ActorRole, blocks: ContentBlock.Any[]): DataType.Message => {
  return Obj.make(DataType.Message, {
    created: new Date().toISOString(),
    sender: { role },
    blocks,
  });
};

const MESSAGES: MessageGenerator[] = [
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
            _tag: 'text',
            text: [
              '## Markdown',
              'Here is a [link](https://dxos.org)',
              'And some **bold** text.',
              // TODO(burdon): Markdown formatting requires a blank line at the end.
              '',
            ].join('\n'),
          },
          {
            _tag: 'text',
            disposition: 'cot',
            text: Array.from({ length: faker.number.int({ min: 3, max: 5 }) })
              .map((_, idx) => `${idx + 1}. ${faker.lorem.paragraph()}`)
              .join('\n'),
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
            text: 'A suggestion:',
          },
          {
            _tag: 'suggestion',
            text: faker.lorem.paragraph(),
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
            text: [faker.lorem.paragraph(), renderObjectLink(obj1), faker.lorem.paragraph(), '\n'].join(' '),
          },

          // Inline cards.
          ...[obj2, obj3, obj4].map(
            (obj) =>
              ({
                _tag: 'text',
                text: renderObjectLink(obj, true),
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
            _tag: 'toolCall',
            toolCallId: '1234',
            name: 'search',
            input: JSON.stringify({}),
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
            input: JSON.stringify({}),
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
              .map(() => faker.lorem.paragraph())
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
            text: faker.lorem.paragraph(),
          },
        ]),
      ]),
    );
  }),
];

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  render: render(DefaultStory),
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
          types: [DataType.Organization, DataType.Person],
        }),
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        IntentPlugin(),
        PreviewPlugin(),
      ],
    }),
    withLayout({
      fullscreen: true,
      // Container: ColumnContainer,
      // classNames: 'is-[40rem]',
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChatThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
    generator: MESSAGES,
    characterDelay: 0,
  },
};

export const Delayed: Story = {
  args: {
    generator: MESSAGES,
    delay: 2_000,
    fadeIn: true,
    cursor: true,
    characterDelay: 0,
  },
};
