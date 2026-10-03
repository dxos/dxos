//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { byTestId, expectScoped, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import * as Button from '../Button/Button.tsx';
import * as Group from './Group.tsx';

const JUSTIFY = ['start', 'end', 'between'] as const;

/** One Group per `justify`, each holding a Cancel and a primary Save, then a `fill` pair and a lone `fill` Submit. */
const DefaultStory = ({ size }: SizeArgs) => (
  <>
    {JUSTIFY.map((justify) => (
      <Group.Group
        key={justify}
        justify={justify === 'start' ? undefined : justify}
        data-testid={`group-${justify}-${size}`}
      >
        <Button.Button data-testid={`cancel-${justify}-${size}`}>Cancel</Button.Button>
        <Button.Button variant='primary' data-testid={`save-${justify}-${size}`}>
          Save
        </Button.Button>
      </Group.Group>
    ))}
    <Group.Group fill data-testid={`fill-${size}`}>
      <Button.Button data-testid={`fill-cancel-${size}`}>Cancel</Button.Button>
      <Button.Button variant='primary' data-testid={`fill-save-${size}`}>
        Save changes
      </Button.Button>
    </Group.Group>
    <Group.Group fill data-testid={`stretch-${size}`}>
      <Button.Button variant='primary' data-testid={`stretch-submit-${size}`}>
        Submit
      </Button.Button>
    </Group.Group>
  </>
);

const meta = {
  title: 'ui/react-ui-core/components/Group',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
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
  args: { allSizes: true },
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
