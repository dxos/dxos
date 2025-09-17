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
import { DataType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { createMessageGenerator } from '../../testing';
import { translations } from '../../translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

faker.seed(1);

type MessageGenerator = Effect.Effect<void, never, DatabaseService | ContextQueueService>;

type StoryProps = ChatThreadProps & { generator?: MessageGenerator[]; delay?: number };

const DefaultStory = ({ generator = [], delay = 0, ...props }: StoryProps) => {
  const space = useSpace();
  const queueDxn = useMemo(() => space?.queues.create().dxn, [space]);
  const queue = useQueue<DataType.Message>(queueDxn);

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

  return <ChatThread {...props} messages={queue?.objects ?? []} />;
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
    generator: createMessageGenerator(),
    characterDelay: 0,
  },
};

export const Delayed: Story = {
  args: {
    generator: createMessageGenerator(),
    delay: 3_000,
    fadeIn: true,
    cursor: false,
    characterDelay: 5,
  },
};
