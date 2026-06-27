//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';

import { DXN } from '@dxos/keys';
import { withTheme } from '@dxos/react-ui/testing';

import { ActivationEvents, Capabilities } from '../../../common';
import { Capability, Plugin } from '../../../core';
import { useApp } from '../../hooks';

// Minimal plugin that contributes a ReactRoot.
const TestPlugin = Plugin.define<{ error?: boolean }>(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.test'),
    name: 'Test Plugin',
    tags: ['system'],
  }),
).pipe(
  Plugin.addModule(({ error }) => ({
    id: 'TestMain',
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed([
        Capability.contributes(Capabilities.ReactRoot, {
          id: 'org.dxos.plugin.test.root',
          root: () => {
            useEffect(() => {
              let t: NodeJS.Timeout;
              if (error) {
                console.log('Ticking...');
                t = setTimeout(() => {
                  console.log('Bang!');
                  throw new Error('Runtime error');
                }, 3_000);
              }

              return () => clearTimeout(t);
            }, [error]);

            return <h1 className='text-lg'>App Started</h1>;
          },
        }),
      ]),
  })),
  Plugin.make,
);

type StoryArgs = { plugins?: Plugin.Plugin[] };

const DefaultStory = ({ plugins }: StoryArgs) => {
  const App = useApp({ plugins });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/components/App',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    plugins: [TestPlugin({})],
  },
};

export const WithError: Story = {
  args: {
    plugins: [TestPlugin({ error: true })],
  },
};
