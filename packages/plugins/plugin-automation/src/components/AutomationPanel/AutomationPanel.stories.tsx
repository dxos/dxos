//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Trigger } from '@dxos/functions';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
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
    <div className='w-96'>
      <AutomationPanel space={space} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-automation/components/AutomationPanel',
  component: AutomationPanel as any,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Operation.PersistentOperation, Trigger.Trigger],
      onCreateSpace: ({ space }) => {
        for (const fn of functions) {
          space.db.add(Obj.make(Operation.PersistentOperation, { ...fn, version: fn.version ?? '0.1.0' }));
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
