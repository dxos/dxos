//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withTheme } from '@dxos/react-ui/testing';

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { useApp } from './useApp';

// Minimal plugin that contributes a ReactRoot.
const TestPlugin = Plugin.define({
  id: 'dxos.org/plugin/test',
  name: 'Test Plugin',
}).pipe(
  Plugin.addModule({
    id: 'TestMain',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () =>
      Effect.succeed([
        Capability.contributes(Common.Capability.ReactRoot, {
          id: 'dxos.org/plugin/test/root',
          root: () => (
            <div className='fixed inset-0 flex items-center justify-center text-2xl'>App Started Successfully!</div>
          ),
        }),
      ]),
  }),
  Plugin.make,
);

const plugins = [TestPlugin()];
const core = [TestPlugin.meta.id];

const DefaultStory = () => {
  const App = useApp({
    plugins,
    core,
    placeholder: () => <div className='fixed inset-0 flex items-center justify-center'>Loading...</div>,
  });

  return <App />;
};

const meta = {
  title: 'sdk/app-framework/App',
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
