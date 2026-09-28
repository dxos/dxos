//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { expectAnchoredBelow } from '../../testing.ts';

const DefaultStory = () => {
  const [selected, setSelected] = useState<string>();
  return (
    <div className='flex flex-col items-start gap-2'>
      <Next.Menu.Root onSelect={({ value }) => setSelected(value)}>
        <Next.Menu.Trigger asChild>
          <Next.Button data-testid='trigger'>Actions</Next.Button>
        </Next.Menu.Trigger>
        <Next.Menu.Content size='md' data-testid='menu'>
          <Next.Menu.ItemGroup>
            <Next.Menu.ItemGroupLabel>Edit</Next.Menu.ItemGroupLabel>
            <Next.Menu.Item value='cut' icon='ph--scissors--regular' shortcut='⌘X'>
              Cut
            </Next.Menu.Item>
            <Next.Menu.Item value='copy' icon='ph--copy--regular' shortcut='⌘C'>
              Copy
            </Next.Menu.Item>
            <Next.Menu.Item value='paste' icon='ph--clipboard--regular' shortcut='⌘V'>
              Paste
            </Next.Menu.Item>
          </Next.Menu.ItemGroup>
          <Next.Menu.Separator />
          <Next.Menu.Item value='archive' disabled>
            Archive
          </Next.Menu.Item>
          <Next.Menu.Item value='delete' icon='ph--trash--regular'>
            Delete
          </Next.Menu.Item>
        </Next.Menu.Content>
      </Next.Menu.Root>
      <Next.Typography data-testid='selected'>
        {selected ? `Selected: ${selected}` : 'Nothing selected'}
      </Next.Typography>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/menu',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opens the menu from its trigger and returns it once it has focus. */
const open = async (canvasElement: HTMLElement) => {
  await userEvent.click(within(canvasElement).getByTestId('trigger'));
  const menu = await within(canvasElement.ownerDocument.body).findByRole('menu');
  await waitFor(() => expect(menu).toHaveFocus());
  return menu;
};

const highlighted = (menu: HTMLElement) => menu.querySelector('[data-highlighted]')?.textContent;

export const Default: Story = {};

/** Arrow keys move the highlight, Enter selects, and the story ends with the menu open. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByTestId('trigger');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    let menu = await open(canvasElement);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toHaveAttribute('data-surface', 'popup');
    await expect(menu).toHaveAttribute('data-size', 'md');
    await expect(within(menu).getByRole('group', { name: 'Edit' })).toBeInTheDocument();
    await expect(within(menu).getAllByRole('menuitem')).toHaveLength(5);
    await expect(within(menu).getByRole('separator')).toBeInTheDocument();

    // The popup sits close under its trigger, start-aligned.
    await expectAnchoredBelow(trigger, menu);

    // Items are block rows; the shortcut trails the label in the description colour.
    const cut = within(menu).getByRole('menuitem', { name: /Cut/ });
    const block = parseFloat(getComputedStyle(menu).getPropertyValue('--nx-block-size')) * 16;
    await expect(cut.getBoundingClientRect().height).toBeCloseTo(block, 0);
    const shortcut = within(cut).getByText('⌘X');
    await expect(shortcut.getBoundingClientRect().right).toBeLessThanOrEqual(cut.getBoundingClientRect().right);
    await expect(getComputedStyle(shortcut).color).not.toBe(getComputedStyle(cut).color);

    // Arrow keys move the highlight and skip the disabled item.
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(highlighted(menu)).toContain('Cut'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(highlighted(menu)).toContain('Copy'));
    const copy = within(menu).getByRole('menuitem', { name: /Copy/ });
    await expect(getComputedStyle(copy).backgroundColor).not.toBe(getComputedStyle(cut).backgroundColor);
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(highlighted(menu)).toContain('Delete'));
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(highlighted(menu)).toContain('Paste'));

    // Enter selects the highlighted item and closes the menu.
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(canvas.getByTestId('selected')).toHaveTextContent('Selected: paste'));
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // Reopen so the story rests on the menu.
    menu = await open(canvasElement);
    await expect(menu).toBeVisible();
  },
};

/** Escape closes the menu and returns focus to the trigger; this story ends closed by design. */
export const Dismiss: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());
    await waitFor(() => expect(within(canvasElement).getByTestId('trigger')).toHaveFocus());
  },
};
