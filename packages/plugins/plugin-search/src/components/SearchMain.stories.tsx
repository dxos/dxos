//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { SearchContextProvider } from '../hooks';
import { translations } from '../translations';

import { SearchMain } from './SearchMain';

faker.seed(1234);

const withSearchContext = (): Decorator => {
  return (Story) => (
    <SearchContextProvider>
      <Story />
    </SearchContextProvider>
  );
};

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  return <SearchMain space={space} />;
};

const meta = {
  title: 'plugins/plugin-search/SearchMain',
  component: SearchMain,
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withSearchContext(),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [TestSchema.Task, TestSchema.Organization, TestSchema.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
              const space = yield* Effect.promise(() => client.spaces.create({ name: 'Test Space' }));
              yield* Effect.promise(() => space.waitUntilReady());
              // Create some test data to search.
              space.db.add(
                Obj.make(TestSchema.Task, { title: 'Project Proposal', description: 'A proposal for a new project' }),
              );
              space.db.add(
                Obj.make(TestSchema.Task, { title: 'Meeting Notes', description: 'Notes from the team meeting' }),
              );
              space.db.add(
                Obj.make(TestSchema.Task, { title: 'Budget Report', description: 'Q3 financial budget report' }),
              );
              space.db.add(Obj.make(TestSchema.Person, { name: 'Alice Smith', email: 'alice@example.com' }));
              space.db.add(Obj.make(TestSchema.Person, { name: 'Bob Jones', email: 'bob@example.com' }));
              space.db.add(Obj.make(TestSchema.Organization, { name: 'Composer Project' }));
            }),
        }),
        ...corePlugins(),
        SpacePlugin({}),
        PreviewPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof SearchMain>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
