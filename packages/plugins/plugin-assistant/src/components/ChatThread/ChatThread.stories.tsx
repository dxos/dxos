//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Filter } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import { ContextQueueService } from '@dxos/compute';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { type Queue, useQuery, useSpaces } from '@dxos/react-client/echo';
import { Card, Popover } from '@dxos/react-ui';
import { EditorPreviewProvider, useEditorPreview } from '@dxos/react-ui-editor';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessageGenerator } from '#testing';

import { translations } from '../../translations';
import { ChatThread, type ChatThreadProps } from './ChatThread';

random.seed(1);

type MessageGenerator = Effect.Effect<void, never, Database.Service | ContextQueueService>;

type DefaultStoryProps = { generator?: MessageGenerator[]; delay?: number; wait?: boolean } & ChatThreadProps;

const DefaultStory = ({ generator = [], delay = 0, wait, ...props }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const queue = useMemo<Queue<Message.Message> | undefined>(() => space?.queues.create(), [space]);
  const messages = useQuery(queue, Filter.type(Message.Message));
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
  }, [space, queue, generator]);

  if (wait && !done) {
    return <Loading data={{ wait, done }} />;
  }

  return (
    <EditorPreviewProvider onLookup={async ({ dxn, label }) => ({ label, text: dxn })}>
      <ChatThread {...props} messages={messages} />
      <PreviewCard />
    </EditorPreviewProvider>
  );
};

const PreviewCard = () => {
  const { target } = useEditorPreview('PreviewCard');

  return (
    <Popover.Portal>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>
          <Card.Root>
            <Card.Heading>{target?.label}</Card.Heading>
            {target && <Card.Text classNames='truncate line-clamp-3'>{target.text}</Card.Text>}
          </Card.Root>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Portal>
  );
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
      wire: true,
      cursor: true,
    },
  },
};
