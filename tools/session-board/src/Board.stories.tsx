//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { translations as taskTranslations } from '@dxos/react-ui-task/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Board } from './Board.tsx';
import { sampleBoard } from './testing/sample.ts';

const meta = {
  title: 'tools/session-board/Board',
  component: Board,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...taskTranslations, ...formTranslations] },
} satisfies Meta<typeof Board>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { board: sampleBoard({ updated: '2026-11-21T12:00:00.000Z' }) },
};

/** An editor's view: each open PR has a Land switch, here held in local state instead of the artifact database. */
export const WithLandSwitch: Story = {
  render: (args) => {
    const [landing, setLanding] = useState<Record<string, boolean>>({});
    return (
      <Board
        {...args}
        landing={landing}
        onLandChange={(pr, land) => setLanding((state) => ({ ...state, [pr.id]: land }))}
      />
    );
  },
  args: { board: sampleBoard({ updated: '2026-11-21T12:00:00.000Z' }) },
};
