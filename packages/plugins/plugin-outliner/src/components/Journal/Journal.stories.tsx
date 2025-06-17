//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useMemo } from 'react';

import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { DataType } from '@dxos/schema';
import { render, withLayout, withTheme } from '@dxos/storybook-utils';

import { Journal } from './Journal';
import translations from '../../translations';
import { createJournal, JournalEntryType, JournalType, OutlineType } from '../../types';

const meta: Meta<typeof Journal> = {
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
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [DataType.Text, JournalType, JournalEntryType, OutlineType],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Journal>;

export const Default: Story = {
  args: {
    journal: createJournal(),
  },
};
