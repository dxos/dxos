//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { create, useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Journal } from './Journal';
import translations from '../../translations';
import { JournalEntryType, JournalType, TreeType } from '../../types';

const meta: Meta<typeof Journal.Root> = {
  title: 'plugins/plugin-outliner/Journal',
  component: Journal.Root,
  render: () => {
    const space = useSpace();
    const [journal, setJournal] = useState<JournalType>();
    useEffect(() => {
      if (space) {
        setJournal(space.db.add(create(JournalType, { name: 'Journal', entries: [] })));
      }
    }, [space]);

    return (
      <div className='flex h-full'>
        <Journal.Root journal={journal} classNames='flex flex-col w-[40rem] h-full overflow-hidden bg-modalSurface' />
      </div>
    );
  },
  decorators: [
    withClientProvider({ createIdentity: true, createSpace: true, types: [JournalType, JournalEntryType, TreeType] }),
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
  args: {},
};
