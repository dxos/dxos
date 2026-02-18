//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/react-ui/testing';
import { Text as TextType } from '@dxos/schema';

import { translations } from '../../translations';
import { Journal, Outline, getDateString } from '../../types';

import { Journal as JournalComponent } from './Journal';

// TODO(wittjosiah): ECHO objects don't work when passed via Storybook args.
const DefaultJournalStory = () => {
  const space = useSpace();
  const journal = useMemo(() => {
    if (space) {
      return space.db.add(Journal.make());
    }
    return undefined;
  }, [space]);
  if (journal) {
    return <JournalComponent journal={journal} />;
  }
  return null;
};

// Create journal with entries at render time (see above comment).
const JournalsStory = () => {
  const space = useSpace();
  const journal = useMemo(() => {
    if (space) {
      const dates = [new Date(Date.now() - 5 * 24 * 60 * 60 * 1_000), new Date(2025, 0, 1)];
      return space.db.add(
        Obj.make(Journal.Journal, {
          name: 'Journal 1',
          entries: dates.reduce(
            (acc, date) => ({ ...acc, [getDateString(date)]: Ref.make(Journal.makeEntry(date)) }),
            {},
          ),
        }),
      );
    }
    return undefined;
  }, [space]);
  if (journal) {
    return <JournalComponent journal={journal} />;
  }
  return null;
};

const meta = {
  title: 'plugins/plugin-outliner/Journal',
  decorators: [
    withTheme(),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [TextType.Text, Journal.Journal, Journal.JournalEntry, Outline.Outline],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultJournalStory />,
};

export const Jounals: Story = {
  render: () => <JournalsStory />,
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

export const Test: StoryObj = {
  render: () => {
    return (
      <div className='flex flex-col is-full justify-center items-center gap-2 m-4'>
        <FocusContainer id='test-1' />
        <FocusContainer id='test-2' />
      </div>
    );
  },
};
