//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { create, makeRef } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Journal } from './Journal';
import translations from '../../translations';
import { JournalType, JournalEntryType, TreeNodeType } from '../../types';

const meta: Meta<typeof Journal.Root> = {
  title: 'plugins/plugin-outliner/Journal',
  component: Journal.Root,
  render: ({ journal }) => {
    return (
      <div className='flex h-full'>
        <Journal.Root classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface' journal={journal} />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({ fullscreen: true, tooltips: true, classNames: 'flex justify-center bg-baseSurface' }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Journal.Root>;

export const Default: Story = {
  args: {
    journal: create(JournalType, {
      name: 'Journal',
      entries: [
        create(JournalEntryType, {
          date: new Date(),
          root: create(TreeNodeType, {
            text: '',
            children: [
              makeRef(
                // TODO(burdon): ERROR: object is not an EchoObject
                create(TreeNodeType, {
                  text: '',
                  children: [],
                }),
              ),
            ],
          }),
        }),
      ],
    }),
  },
};
