//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Routine } from '@dxos/compute';
import { Filter } from '@dxos/echo';
import { AutomationPlugin } from '@dxos/plugin-automation/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { RoutineArticle } from './RoutineArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [routine] = useQuery(space?.db, Filter.type(Routine.Routine));
  if (!routine) {
    return <Loading />;
  }

  return <RoutineArticle role='article' subject={routine} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-automation/containers/RoutineArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Routine.Routine],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());

              space.db.add(
                Routine.make({
                  name: 'Summarize',
                  instructions: 'Create a new markdown document that is a summary of the selected object.',
                }),
              );
            }),
        }),
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
