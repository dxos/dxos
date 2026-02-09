//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Function, Trigger } from '@dxos/functions';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { functions } from '../../testing';
import { translations } from '../../translations';

import { AutomationPanel } from './AutomationPanel';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[1];

  return (
    <div className='is-96'>
      <AutomationPanel space={space} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/AutomationPanel',
  component: AutomationPanel as any,
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Function.Function, Trigger.Trigger],
      onCreateSpace: ({ space }) => {
        for (const fn of functions) {
          space.db.add(Function.make(fn));
        }
      },
    }),
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
