//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

const TRAIL = ['Home', 'Projects', 'Composer', 'Design review', 'Breadcrumbs'];

type StoryArgs = SizeArgs & { steps: number };

const DefaultStory = ({ steps }: StoryArgs) => {
  const [trail, setTrail] = useState(TRAIL.slice(0, steps));
  const current = trail[trail.length - 1];
  return (
    <Next.Breadcrumb.Root aria-label='Breadcrumbs' data-testid='breadcrumb'>
      <Next.Breadcrumb.List>
        {trail.slice(0, -1).map((step, index) => (
          <Fragment key={step}>
            <Next.Breadcrumb.Item>
              <Next.Breadcrumb.Link asChild>
                <button type='button' onClick={() => setTrail((trail) => trail.slice(0, index + 1))}>
                  {step}
                </button>
              </Next.Breadcrumb.Link>
            </Next.Breadcrumb.Item>
            <Next.Breadcrumb.Separator />
          </Fragment>
        ))}
        <Next.Breadcrumb.Item>
          <Next.Breadcrumb.Current>{current}</Next.Breadcrumb.Current>
        </Next.Breadcrumb.Item>
      </Next.Breadcrumb.List>
    </Next.Breadcrumb.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Breadcrumb',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[24rem]' }), withTheme()],
  args: { size: 'md', steps: TRAIL.length },
  argTypes: { ...SIZE_ARG_TYPES, steps: { control: { type: 'range', min: 1, max: TRAIL.length, step: 1 } } },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * A named nav landmark around a list of steps (separators hidden), the last marked current; the trail stays one row
 * and scrolls when it overflows; a link navigates back.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    const row = sizeRow(canvasElement, 'md');
    const canvas = within(row);
    const nav = canvas.getByRole('navigation', { name: 'Breadcrumbs' });
    const list = within(nav).getByRole('list');
    await expect(list.tagName).toBe('OL');
    await expect(within(list).getAllByRole('listitem')).toHaveLength(TRAIL.length);
    await expect(row.querySelectorAll('[data-part="separator"][aria-hidden="true"]')).toHaveLength(TRAIL.length - 1);
    await expect(canvas.getByText('Breadcrumbs')).toHaveAttribute('aria-current', 'page');

    // One row, a block tall, scrolling sideways once it overflows the 24rem pane.
    const block = parseFloat(getComputedStyle(list).getPropertyValue('--nx-block-size')) * 16;
    await expect(list.getBoundingClientRect().height).toBeCloseTo(block, 0);
    const tops = within(list)
      .getAllByRole('listitem')
      .map((item) => Math.round(item.getBoundingClientRect().top + item.getBoundingClientRect().height / 2));
    await expect(new Set(tops).size).toBe(1);
    await expect(list.scrollWidth).toBeGreaterThan(list.clientWidth);

    // Links are subdued next to the current page.
    const link = canvas.getByRole('button', { name: 'Projects' });
    await expect(getComputedStyle(link).color).not.toBe(getComputedStyle(canvas.getByText('Breadcrumbs')).color);

    await userEvent.click(link);
    await expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    await expect(canvas.getByText('Projects')).toHaveAttribute('aria-current', 'page');
  },
};
