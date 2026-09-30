//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectScoped, sizeRow } from '../../testing.ts';

const JUSTIFY = ['start', 'end', 'between'] as const;

/** One Group per `justify`, each holding a Cancel and a primary Save, then a `fill` pair and a lone `fill` Submit. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    {JUSTIFY.map((justify) => (
      <Next.Group
        key={justify}
        justify={justify === 'start' ? undefined : justify}
        data-testid={`group-${justify}-${size}`}
      >
        <Next.Button data-testid={`cancel-${justify}-${size}`}>Cancel</Next.Button>
        <Next.Button variant='primary' data-testid={`save-${justify}-${size}`}>
          Save
        </Next.Button>
      </Next.Group>
    ))}
    <Next.Group fill data-testid={`fill-${size}`}>
      <Next.Button data-testid={`fill-cancel-${size}`}>Cancel</Next.Button>
      <Next.Button variant='primary' data-testid={`fill-save-${size}`}>
        Save changes
      </Next.Button>
    </Next.Group>
    <Next.Group fill data-testid={`stretch-${size}`}>
      <Next.Button variant='primary' data-testid={`stretch-submit-${size}`}>
        Submit
      </Next.Button>
    </Next.Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/next/components/group',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

const edges = (root: HTMLElement, justify: (typeof JUSTIFY)[number]) => ({
  group: byTestId(root, `group-${justify}-md`).getBoundingClientRect(),
  cancel: byTestId(root, `cancel-${justify}-md`).getBoundingClientRect(),
  save: byTestId(root, `save-${justify}-md`).getBoundingClientRect(),
});

export const Default: Story = {};

/**
 * A group claims no role or keyboard contract, unlike Toolbar (follow-up 1); by default it packs to the start, and
 * `justify` packs it to the end or spreads it between. `fill` gives each child an equal share of the width, so a lone
 * child stretches across the group.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    await expect(canvas.queryByRole('toolbar')).toBeNull();
    await expect(byTestId(canvasElement, 'group-start-md')).not.toHaveAttribute('role');
    await expect(byTestId(canvasElement, 'save-start-md').tabIndex).toBe(0);
    await expect(byTestId(canvasElement, 'cancel-start-md').tabIndex).toBe(0);
    const start = edges(canvasElement, 'start');
    await expect(start.cancel.left).toBeCloseTo(start.group.left, 0);
    await expectScoped(canvasElement);

    const end = edges(canvasElement, 'end');
    await expect(end.save.right).toBeCloseTo(end.group.right, 0);

    const between = edges(canvasElement, 'between');
    await expect(between.cancel.left).toBeCloseTo(between.group.left, 0);
    await expect(between.save.right).toBeCloseTo(between.group.right, 0);

    const fill = byTestId(canvasElement, 'fill-md').getBoundingClientRect();
    const cancel = byTestId(canvasElement, 'fill-cancel-md').getBoundingClientRect();
    const save = byTestId(canvasElement, 'fill-save-md').getBoundingClientRect();
    await expect(cancel.width).toBeCloseTo(save.width, 0);
    await expect(cancel.left).toBeCloseTo(fill.left, 0);
    await expect(save.right).toBeCloseTo(fill.right, 0);
    const stretch = byTestId(canvasElement, 'stretch-md').getBoundingClientRect();
    await expect(byTestId(canvasElement, 'stretch-submit-md').getBoundingClientRect().width).toBeCloseTo(
      stretch.width,
      0,
    );
  },
};
