//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';

import { translations } from '../../translations';
import { JournalEntryType, JournalType, OutlineType, createJournal, createJournalEntry } from '../../types';

import { Journal } from './Journal';

const meta = {
  title: 'plugins/plugin-outliner/Journal',
  component: Journal,
  render: render(({ journal: _journal }) => {
    const space = useSpace();
    // TODO(burdon): Throws:
    //  Uncaught InvariantViolation: invariant violation: assignFromLocalState [doc] at packages/core/echo/echo-db/src/core-db/object-core.ts:126
    //  Uncaught Error: Object references must be wrapped with `Ref.make`
    const journal = useMemo(() => space?.db.add(_journal), [space, _journal]);
    if (journal) {
      return <Journal journal={journal} />;
    }
  }),
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [DataType.Text.Text, JournalType, JournalEntryType, OutlineType],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Journal>;

export default meta;

type Story = StoryObj<typeof Journal>;

export const Default: Story = {
  args: {
    journal: createJournal(),
  },
};

export const Jounals: Story = {
  args: {
    journal: Obj.make(JournalType, {
      name: 'Journal 1',
      entries: [
        Ref.make(createJournalEntry()),
        Ref.make(createJournalEntry(new Date(Date.now() - 5 * 24 * 60 * 60 * 1_000))),
        Ref.make(createJournalEntry(new Date(2025, 0, 1))),
      ],
    }),
  },
};

const FocusContainer = ({ id }: { id: string }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div
      id={id}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
      className='group'
      {...{ 'data-has-focus': focused ? true : undefined }}
    >
      <div>
        <div className='flex gap-2 p-2 group-data-[has-focus]:outline'>
          <input type='text' />
          <button onClick={() => setFocused(true)}>Focus</button>
        </div>
      </div>
    </div>
  );
};

export const Test: Story = {
  render: () => {
    return (
      <div className='flex flex-col w-full justify-center items-center gap-2 m-4'>
        <FocusContainer id='test-1' />
        <FocusContainer id='test-2' />
      </div>
    );
  },
};
