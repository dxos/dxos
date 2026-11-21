//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Board } from './Board.tsx';
import { sampleBoard } from './testing/sample.ts';

const meta = {
  title: 'tools/session-board/Board',
  component: Board,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof Board>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { board: sampleBoard({ updated: '2026-11-21T12:00:00.000Z', branch: 'claude/session-board' }) },
};
