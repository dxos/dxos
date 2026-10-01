//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { controlSize, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';

type StoryArgs = SizeArgs & {
  orientation?: Next.TabsOrientation;
  selectedVariant?: Next.TabsSelectedVariant;
  keepMounted?: boolean;
};

const DefaultStory = ({ size, orientation, selectedVariant, keepMounted }: StoryArgs) => (
  <Next.Tabs.Root
    defaultValue='overview'
    orientation={orientation}
    selectedVariant={selectedVariant}
    keepMounted={keepMounted}
    classNames='h-40'
    data-testid={`tabs-${size}`}
  >
    <Next.Tabs.List aria-label='Project'>
      <Next.Tabs.Trigger value='overview' label='Overview' />
      <Next.Tabs.Trigger value='tasks' icon='ph--check-square--regular' label='Tasks' />
      <Next.Tabs.Trigger value='settings' icon='ph--gear--regular' label='Settings' iconOnly />
    </Next.Tabs.List>
    <Next.Tabs.Content value='overview'>
      <Next.Typography>A summary of the project.</Next.Typography>
    </Next.Tabs.Content>
    <Next.Tabs.Content value='tasks'>
      <Next.Typography>Three open tasks.</Next.Typography>
    </Next.Tabs.Content>
    <Next.Tabs.Content value='settings'>
      <Next.Input aria-label='Name' defaultValue='Apollo' />
    </Next.Tabs.Content>
  </Next.Tabs.Root>
);

const meta = {
  title: 'ui/react-ui-core/next/components/Tabs',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[32rem]' }), withTheme()],
  args: { size: 'md', orientation: 'horizontal', selectedVariant: 'default', keepMounted: false },
  argTypes: {
    ...SIZE_ARG_TYPES,
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    selectedVariant: { control: 'inline-radio', options: ['default', 'primary'] },
  },
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Triggers are controls per size; a click or Enter selects (manual activation) and the old panel unmounts. */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const canvas = within(sizeRow(canvasElement, size));
      const overview = canvas.getByRole('tab', { name: 'Overview' });
      await expect(overview.getBoundingClientRect().height).toBeCloseTo(controlSize(size), 0);
    }

    const canvas = within(sizeRow(canvasElement, 'md'));
    await expect(canvas.getByRole('tablist', { name: 'Project' })).toHaveAttribute('aria-orientation', 'horizontal');
    const overview = canvas.getByRole('tab', { name: 'Overview' });
    const tasks = canvas.getByRole('tab', { name: 'Tasks' });
    await expect(overview).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('A summary of the project.');

    // The selected trigger fills; the others stay ghost.
    await expect(getComputedStyle(overview).backgroundColor).not.toBe(getComputedStyle(tasks).backgroundColor);

    await userEvent.click(tasks);
    await expect(tasks).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(canvas.getByRole('tabpanel')).toHaveTextContent('Three open tasks.'));
    await expect(canvas.queryByText('A summary of the project.')).toBeNull();

    // Arrow keys move focus (on the next frame) without selecting; Enter selects.
    const settings = canvas.getByRole('tab', { name: 'Settings' });
    overview.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(tasks).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(settings).toHaveFocus());
    await expect(settings).toHaveAttribute('aria-selected', 'false');
    await userEvent.keyboard('{Enter}');
    await expect(settings).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(canvas.getByRole('textbox', { name: 'Name' })).toBeVisible());
  },
};

/** A vertical list sits beside the content; its triggers fill the column and start-align. */
export const Vertical: Story = {
  args: { orientation: 'vertical', keepMounted: true },
  play: async ({ canvasElement }) => {
    const canvas = within(sizeRow(canvasElement, 'md'));
    const list = canvas.getByRole('tablist');
    const panel = canvas.getByRole('tabpanel');
    await expect(list).toHaveAttribute('aria-orientation', 'vertical');
    await expect(list.getBoundingClientRect().right).toBeLessThanOrEqual(panel.getBoundingClientRect().left + 0.5);

    const overview = canvas.getByRole('tab', { name: 'Overview' });
    const tasks = canvas.getByRole('tab', { name: 'Tasks' });
    await expect(overview.getBoundingClientRect().width).toBeCloseTo(tasks.getBoundingClientRect().width, 0);

    // `keepMounted` keeps the hidden panels in the DOM.
    await expect(canvas.getByText('Three open tasks.', { selector: '*' })).not.toBeVisible();
    overview.focus();
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(tasks).toHaveFocus());
  },
};

/** `Trigger asChild`: the child element is the tab, unstyled (e.g. a rail of avatars), with the tab's state and keys. */
export const CustomTrigger: Story = {
  render: () => (
    <Next.Tabs.Root defaultValue='a' orientation='vertical'>
      <Next.Tabs.List>
        {['a', 'b'].map((value) => (
          <Next.Tabs.Trigger key={value} asChild value={value}>
            <button type='button' aria-label={`Space ${value}`} className='size-8 rounded-full bg-input-surface'>
              {value.toUpperCase()}
            </button>
          </Next.Tabs.Trigger>
        ))}
      </Next.Tabs.List>
      <Next.Tabs.Content value='a'>First</Next.Tabs.Content>
      <Next.Tabs.Content value='b'>Second</Next.Tabs.Content>
    </Next.Tabs.Root>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const second = canvas.getByRole('tab', { name: 'Space b' });
    await expect(second).not.toHaveAttribute('data-variant');
    await userEvent.click(second);
    await waitFor(() => expect(second).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(canvas.getByText('Second')).toBeVisible());
  },
};
