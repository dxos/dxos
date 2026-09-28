//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { byTestId, expectScoped } from '../../testing.ts';

type StoryArgs = {
  justify?: Next.GroupProps['justify'];
};

const DefaultStory = ({ justify }: StoryArgs) => (
  <div className='nx-scope @container w-[28rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail' level='base' data-testid='host'>
      <Next.Group justify={justify} data-testid='group'>
        <Next.Button data-testid='cancel'>Cancel</Next.Button>
        <Next.Button variant='primary' data-testid='save'>
          Save
        </Next.Button>
      </Next.Group>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/group',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const edges = (root: HTMLElement) => {
  const group = byTestId(root, 'group').getBoundingClientRect();
  return {
    group,
    cancel: byTestId(root, 'cancel').getBoundingClientRect(),
    save: byTestId(root, 'save').getBoundingClientRect(),
  };
};

export const Default: Story = {};

/** A group claims no role or keyboard contract, unlike Toolbar (follow-up 1); by default it packs to the start. */
export const Start: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('toolbar')).toBeNull();
    await expect(byTestId(canvasElement, 'group')).not.toHaveAttribute('role');
    await expect(byTestId(canvasElement, 'save').tabIndex).toBe(0);
    await expect(byTestId(canvasElement, 'cancel').tabIndex).toBe(0);
    const { group, cancel } = edges(canvasElement);
    await expect(cancel.left).toBeCloseTo(group.left, 0);
    await expectScoped(canvasElement);
  },
};

export const End: Story = {
  args: { justify: 'end' },
  play: async ({ canvasElement }) => {
    const { group, save } = edges(canvasElement);
    await expect(save.right).toBeCloseTo(group.right, 0);
  },
};

export const Between: Story = {
  args: { justify: 'between' },
  play: async ({ canvasElement }) => {
    const { group, cancel, save } = edges(canvasElement);
    await expect(cancel.left).toBeCloseTo(group.left, 0);
    await expect(save.right).toBeCloseTo(group.right, 0);
  },
};
