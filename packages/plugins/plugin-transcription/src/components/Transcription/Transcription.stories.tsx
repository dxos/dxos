//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Space } from '@dxos/client/echo';
import { Database, Feed, Filter, Query } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useMembers, useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';

import { useFeedModelAdapter } from '#hooks';
import { MessageBuilder, TestItem } from '#testing';
import { translations } from '#translations';

import { renderByline } from '../../util';
import { Transcription } from './Transcription';

random.seed(1);

type StoryArgs = {};

const DefaultStory = (props: StoryArgs) => {
  const [running, setRunning] = useState(false);

  const [space] = useSpaces();
  const feed = useTestTranscriptionQueue(space, running, 2_000);
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );

  const members = useMembers(space?.id).map((member) => member.identity);
  const model = useFeedModelAdapter(renderByline(members), messages, []);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Start'}
            onClick={() => setRunning(!running)}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <Transcription model={model} {...props} />
      </Panel.Content>
      <Panel.Statusbar className='flex items-center justify-center'>
        <JsonHighlighter data={model.toJSON()} indent={0} classNames='text-sm' />
      </Panel.Statusbar>
    </Panel.Root>
  );
};

type UseTestTranscriptionQueue = (
  space: Space | undefined,
  running?: boolean,
  interval?: number,
) => Feed.Feed | undefined;

/**
 * Test transcription feed.
 */
const useTestTranscriptionQueue: UseTestTranscriptionQueue = (
  space: Space | undefined,
  running = true,
  interval = 1_000,
) => {
  const feed = useMemo(() => (space ? space.db.add(Feed.make({ name: 'transcription' })) : undefined), [space]);
  const builder = useMemo(() => new MessageBuilder(space), [space]);
  useEffect(() => {
    if (!space || !feed || !running) {
      return;
    }

    const i = setInterval(() => {
      void builder.createMessage(Math.ceil(Math.random() * 3)).then(async (message) => {
        await Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(space.db)), EffectEx.runAndForwardErrors);
      });
    }, interval);
    return () => clearInterval(i);
  }, [space, feed, running, interval]);
  return feed;
};

const meta = {
  title: 'plugins/plugin-transcription/components/Transcription',
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [TestItem, Person.Person, Organization.Organization, Feed.Feed, Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        PreviewPlugin(),
      ],
    }),
  ],
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
