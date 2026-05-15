//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Operation, Trigger } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';

import { functions } from '#testing';
import { translations } from '#translations';

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
          const { key, version, ...data } = fn;
          space.db.add(
            Obj.make(Operation.PersistentOperation, {
              [Obj.Meta]: { key, version: version ?? '0.1.0' },
              ...data,
            }),
          );
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
