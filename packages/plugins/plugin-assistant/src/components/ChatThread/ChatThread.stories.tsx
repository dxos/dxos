//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Feed, Filter, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { EditorPreviewProvider } from '@dxos/react-ui-editor';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessageGenerator } from '#testing';
import { translations } from '#translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

random.seed(1);

type MessageGenerator = Effect.Effect<void, never, Database.Service | Feed.ContextFeedService>;

type StoryArgs = { generator?: MessageGenerator[]; delay?: number; wait?: boolean } & ChatThreadProps;

const DefaultStory = ({ generator = [], delay = 0, wait, ...props }: StoryArgs) => {
  const [space] = useSpaces();
  const feed = useMemo<Feed.Feed | undefined>(
    () => (space ? space.db.add(Feed.make({ name: 'chat' })) : undefined),
    [space],
  );
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const [done, setDone] = useState(false);

  // Generate messages.
  useEffect(() => {
    if (!space || !feed) {
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
      }).pipe(Effect.provide(Layer.mergeAll(Database.layer(space.db), Feed.ContextFeedService.layer(feed)))),
    );

    return () => {
      void EffectEx.runAndForwardErrors(Fiber.interrupt(fiber));
    };
  }, [space, feed, generator, delay]);

  if (wait && !done) {
    return <Loading data={{ wait, done }} />;
  }

  return (
    <EditorPreviewProvider onLookup={async ({ dxn, label }) => ({ label, text: dxn })}>
      <ChatThread {...props} messages={messages} />
    </EditorPreviewProvider>
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
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Feed.Feed, Message.Message, Organization.Organization, Person.Person],
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
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

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
