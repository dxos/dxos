//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ContextQueueService } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { type Queue, useSpaces } from '@dxos/react-client/echo';
import { EditorPreviewProvider } from '@dxos/react-ui-editor';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessageGenerator } from '#testing';
import { translations } from '#translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

random.seed(1);

type MessageGenerator = Effect.Effect<void, never, Database.Service | ContextQueueService>;

type DefaultStoryProps = { generator?: MessageGenerator[]; delay?: number; wait?: boolean } & ChatThreadProps;

const DefaultStory = ({ generator = [], delay = 0, wait, ...props }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const queue = useMemo<Queue<Message.Message> | undefined>(() => space?.queues.create(), [space]);
  const messages = useQueueMessages(queue);
  const [done, setDone] = useState(false);

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

        setDone(true);
      }).pipe(Effect.provide(Layer.mergeAll(Database.layer(space.db), ContextQueueService.layer(queue)))),
    );

    return () => {
      void runAndForwardErrors(Fiber.interrupt(fiber));
    };
  }, [space, queue, generator, delay]);

  if (wait && !done) {
    return <Loading data={{ wait, done }} />;
  }

  return (
    <EditorPreviewProvider onLookup={async ({ dxn, label }) => ({ label, text: dxn })}>
      <ChatThread {...props} messages={messages} />
    </EditorPreviewProvider>
  );
};

const useQueueMessages = (queue?: Queue<Message.Message>) => {
  const [messages, setMessages] = useState<Message.Message[]>([]);

  useEffect(() => {
    if (!queue) {
      setMessages([]);
      return;
    }

    const update = () => setMessages([...queue.objects]);
    update();
    return queue.subscribe(update);
  }, [queue]);

  return messages;
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread',
  component: ChatThread,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<DefaultStoryProps>;

export default meta;

type Story = StoryObj<DefaultStoryProps>;

export const Default: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
  },
};

export const Delayed: Story = {
  args: {
    generator: createMessageGenerator(),
    delay: 500,
    options: {
      autoScroll: true,
      typewriter: true,
      cursor: true,
    },
  },
};
