//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AutomationPlugin } from '@dxos/plugin-automation';
import { ClientPlugin } from '@dxos/plugin-client';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createNotebook } from '../../testing';
import { translations } from '../../translations';

import { NotebookStack } from './NotebookStack';

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const NotebookStackStory = () => {
  const notebook = useMemo(() => createNotebook(), []);
  return <NotebookStack notebook={notebook} />;
};

const meta = {
  title: 'plugins/plugin-script/NotebookStack',
  component: NotebookStackStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column', classNames: 'is-proseMaxWidth' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* Effect.promise(() => client.halo.createIdentity());
              yield* Effect.promise(() => client.spaces.waitUntilReady());
            }),
        }),
        AutomationPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof NotebookStackStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
