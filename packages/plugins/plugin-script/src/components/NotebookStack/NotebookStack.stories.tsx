//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { createNotebook } from '#testing';
import { translations } from '#translations';

import { NotebookStack } from './NotebookStack';

const NotebookStackStory = () => {
  const notebook = useMemo(() => createNotebook(), []);
  return <NotebookStack notebook={notebook} />;
};

const meta = {
  title: 'plugins/plugin-script/components/NotebookStack',
  component: NotebookStackStory,
  decorators: [
    withLayout({ layout: 'column', classNames: 'dx-document' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        RoutinePlugin(),
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
