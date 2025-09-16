//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { Effect, Fiber, Layer } from 'effect';
import React, { useEffect, useMemo } from 'react';

import { ContextQueueService, DatabaseService } from '@dxos/functions';
import { faker } from '@dxos/random';
import { useQueue, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { createMessageGenerator } from '../../testing';
import { translations } from '../../translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

faker.seed(1);

type MessageGenerator = Effect.Effect<void, never, DatabaseService | ContextQueueService>;

type StoryProps = ChatThreadProps & { generator?: MessageGenerator[]; delay?: number; debug?: boolean };

const DefaultStory = ({ generator = [], delay = 0, debug = false, ...props }: StoryProps) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
  const queue = useQueue<DataType.Message>(queueDxn);

  // useEffect(() => {
  //   if (queue) {
  //     const { state, content} =  f(queue.objects, state);
  //   }
  // }, [queue]);

  // Generate messages.
  useEffect(() => {
    if (!space || !queue) {
      return;
    }

    const fiber = Effect.runFork(
      Effect.gen(function* () {
        for (const step of generator) {
          yield* step;
          if (delay) {
            yield* Effect.sleep(delay);
          }
        }
      }).pipe(Effect.provide(Layer.mergeAll(DatabaseService.layer(space.db), ContextQueueService.layer(queue)))),
    );

    return () => {
      void Effect.runPromise(Fiber.interrupt(fiber));
    };
  }, [space, queue, generator]);

  // Debug content.
  // const { content, reset } = useSyncer(queue?.objects ?? []);
  // const [lines, setLines] = useState<string[]>([]);
  // useEffect(() => {
  //   console.log(content, reset);
  //   if (reset) {
  //     setLines([content]);
  //   } else {
  //     setLines((lines) => [...lines, content]);
  //   }
  // }, [content, reset]);

  return (
    <div className={mx('grid divide-x divide-separator bs-full is-full', debug && 'grid-cols-2')}>
      <ChatThread {...props} messages={queue?.objects ?? []} />
      {debug && (
        <div className='p-2 overflow-y-auto'>
          {/* <pre className='text-xs text-subdued'>{lines.join('\n')}</pre> */}
        </div>
      )}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/ChatThread',
  component: ChatThread,
  render: DefaultStory,
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [DataType.Organization, DataType.Person] }),
    withLayout({ fullscreen: true }),
    withTheme,
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
    generator: createMessageGenerator(),
    characterDelay: 0,
  },
};

export const Delayed: Story = {
  args: {
    debug: true,
    generator: createMessageGenerator(),
    delay: 2_000,
    fadeIn: true,
    cursor: true,
    characterDelay: 5,
  },
};
