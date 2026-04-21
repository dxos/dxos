//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import { Feed, Filter } from '@dxos/echo';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ClientPlugin } from '@dxos/plugin-client';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { MapPlugin } from '@dxos/plugin-map';
import { TablePlugin } from '@dxos/plugin-table';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { createObjectFactory } from '@dxos/schema/testing';
import { Organization, Person } from '@dxos/types';

import { useBlueprintRegistry, useContextBinder } from '#hooks';

import { translations } from '../../translations';
import { ChatOptions, ObjectsPanel, type ChatOptionsProps } from './ChatOptions';

random.seed(1);

const presets = [
  { id: 'edge-claude-sonnet', label: 'Edge · Claude Sonnet' },
  { id: 'edge-gpt-4o', label: 'Edge · GPT-4o' },
  { id: 'ollama-llama3', label: 'Ollama · Llama 3' },
];

type DefaultStoryProps = Pick<ChatOptionsProps, 'presets'>;

const DefaultStory = ({ presets }: DefaultStoryProps) => {
  const [space] = useSpaces();
  const [feed] = useQuery(space?.db, Filter.type(Feed.Feed));
  const blueprintRegistry = useBlueprintRegistry();
  const binder = useContextBinder(space, feed);
  const [preset, setPreset] = useState(presets?.[0]?.id);
  if (!space || !binder) {
    return <Loading />;
  }
  return (
    <ChatOptions
      db={space.db}
      context={binder}
      blueprintRegistry={blueprintRegistry}
      presets={presets}
      preset={preset}
      onPresetChange={setPreset}
    />
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatOptions',
  component: ChatOptions as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Feed.Feed, Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              // Populate space with sample objects.
              const factory = createObjectFactory(space.db, random as any);
              yield* Effect.promise(() =>
                factory([
                  { type: Organization.Organization, count: 8 },
                  { type: Person.Person, count: 8 },
                ]),
              );

              // Create the chat feed used by the context binder.
              space.db.add(Feed.make());
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        ChessPlugin(),
        MapPlugin(),
        TablePlugin(),
      ],
      capabilities,
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    presets,
  },
};

export const ObjectsPanelStory: Story = {
  render: () => {
    const [space] = useSpaces();
    const [feed] = useQuery(space?.db, Filter.type(Feed.Feed));
    const binder = useContextBinder(space, feed);
    if (!space || !binder) {
      return <Loading />;
    }

    return (
      <div className='flex flex-col w-[300px] h-[300px] border border-separator'>
        <ObjectsPanel db={space.db} context={binder} />
      </div>
    );
  },
};
