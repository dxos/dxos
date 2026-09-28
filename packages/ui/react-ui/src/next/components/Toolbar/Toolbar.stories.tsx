//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreY, controlSize, expectScoped } from '../../testing.ts';

const OPTIONS: Next.SelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'blue', label: 'Blue' },
];

const DefaultStory = () => (
  <div className='nx-scope flex flex-col gap-2 w-[32rem]' data-size='md'>
    {SIZES.map((size) => (
      <Next.Toolbar key={size} size={size} data-testid={`toolbar-${size}`}>
        <Next.Block>
          <Next.Icon icon='ph--circle--regular' />
        </Next.Block>
        <Next.IconButton icon='ph--plus--regular' label={`Add ${size}`} data-testid={`add-${size}`} />
        <Next.IconButton icon='ph--minus--regular' label={`Remove ${size}`} data-testid={`remove-${size}`} />
        <Next.Button data-testid={`button-${size}`}>Save</Next.Button>
        <Next.Input placeholder='Search' aria-label={`Search ${size}`} data-testid={`input-${size}`} />
        <Next.Select.Root items={OPTIONS} positioning={{ sameWidth: true }}>
          <Next.Select.Trigger placeholder='Color' aria-label={`Color ${size}`} data-testid={`select-${size}`} />
          <Next.Select.Content size={size}>
            {OPTIONS.map((item) => (
              <Next.Select.Item key={item.value} item={item} />
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      </Next.Toolbar>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/toolbar',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A toolbar is one block tall and every control in it is control-tall and centred (decision 12). */
export const Sizes: Story = {
  play: async ({ canvasElement }) => {
    for (const size of SIZES) {
      const toolbar = byTestId(canvasElement, `toolbar-${size}`).getBoundingClientRect();
      await expect(toolbar.height, `toolbar-${size}`).toBeCloseTo(GEOMETRY[size].block, 0);
      for (const part of ['add', 'remove', 'button', 'input', 'select']) {
        const rect = byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect();
        await expect(rect.height, `${part}-${size} height`).toBeCloseTo(controlSize(size), 0);
        await expect(centreY(rect), `${part}-${size} centre`).toBeCloseTo(centreY(toolbar), 0);
      }
    }
  },
};

/** The toolbar role comes from the machine that implements its keyboard contract (decision 9). */
export const Roles: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toolbars = canvas.getAllByRole('toolbar');
    await expect(toolbars).toHaveLength(SIZES.length);
    for (const toolbar of toolbars) {
      await expect(toolbar).toHaveAttribute('aria-orientation', 'horizontal');
    }
    await expectScoped(canvasElement);
  },
};

/** Arrow keys, Home and End rove across toolbar items; only one item is in the tab order. */
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const add = byTestId(canvasElement, 'add-md');
    const remove = byTestId(canvasElement, 'remove-md');
    const save = byTestId(canvasElement, 'button-md');
    const select = byTestId(canvasElement, 'select-md');
    await waitFor(() => expect(add.tabIndex).toBe(0));
    await expect(remove.tabIndex).toBe(-1);

    add.focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(remove).toHaveFocus();
    await expect(remove.tabIndex).toBe(0);
    await expect(add.tabIndex).toBe(-1);
    await userEvent.keyboard('{ArrowRight}');
    await expect(save).toHaveFocus();
    await userEvent.keyboard('{End}');
    await expect(select).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(add).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    await expect(select).toHaveFocus();
  },
};

/**
 * The visible space between any two adjacent items is three control insets: the toolbar's gap plus each item's
 * inline margin (an IconButton's inset cell, or the same margin on a Button, Input or Select trigger).
 */
export const Spacing: Story = {
  play: async ({ canvasElement }) => {
    for (const size of ['md', 'lg'] as const) {
      const expected = 3 * GEOMETRY[size].inset;
      const items = ['add', 'remove', 'button', 'input', 'select'].map((part) =>
        byTestId(canvasElement, `${part}-${size}`).getBoundingClientRect(),
      );
      for (let index = 1; index < items.length; index++) {
        await expect(items[index].left - items[index - 1].right, `${size} gap ${index}`).toBeCloseTo(expected, 0);
      }
    }
  },
};
