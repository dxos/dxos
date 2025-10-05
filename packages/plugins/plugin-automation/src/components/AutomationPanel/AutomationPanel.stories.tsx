//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { FunctionTrigger, FunctionType } from '@dxos/functions';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';

import { functions } from '../../testing';
import { translations } from '../../translations';

import { AutomationPanel } from './AutomationPanel';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[1];

  return (
    <div className='w-96'>
      <AutomationPanel space={space} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/AutomationPanel',
  component: AutomationPanel as any,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [FunctionType, FunctionTrigger],
      onCreateSpace: ({ space }) => {
        for (const fn of functions) {
          space.db.add(Obj.make(FunctionType, fn));
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
