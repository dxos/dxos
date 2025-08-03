//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { Obj } from '@dxos/echo';
import { FunctionTrigger, FunctionType } from '@dxos/functions';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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

const meta: Meta = {
  title: 'plugins/plugin-automation/AutomationPanel',
  component: AutomationPanel,
  render: DefaultStory,
  decorators: [
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [FunctionType, FunctionTrigger],
      onSpaceCreated: ({ space }) => {
        for (const fn of functions) {
          space.db.add(Obj.make(FunctionType, fn));
        }
      },
    }),
    withLayout(),
    withTheme,
  ],
  parameters: {
    layout: 'centered',
    translations,
  },
};

export default meta;

export const Default = {};
