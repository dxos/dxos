//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { FunctionType, FunctionTrigger } from '@dxos/functions/types';
import { create, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { AutomationPanel } from './AutomationPanel';
import { functions } from '../../testing';
import translations from '../../translations';

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[1];

  return (
    <div role='none' className='flex w-[350px] border border-separator overflow-hidden'>
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
          space.db.add(create(FunctionType, fn));
        }
      },
    }),
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center m-2' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

export const Default = {};
