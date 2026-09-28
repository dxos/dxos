//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectAnchoredBelow, expectArrow } from '../../testing.ts';

/**
 * A menu of items, groups, a checkbox item, a radio group and a nested menu; a region with a context menu; and a menu
 * with no trigger, opened under control and anchored to a text span (a virtual trigger) with an arrow.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [selected, setSelected] = useState<string>();
  const [grid, setGrid] = useState(true);
  const [sort, setSort] = useState('name');
  const [anchored, setAnchored] = useState(false);
  const anchor = useRef<HTMLSpanElement>(null);
  return (
    <>
      <Next.Menu.Root onSelect={({ value }) => setSelected(value)}>
        <Next.Menu.Trigger asChild>
          <Next.Button data-testid={`trigger-${size}`}>Actions</Next.Button>
        </Next.Menu.Trigger>
        <Next.Menu.Content size={size}>
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
          <Next.Menu.Separator />
          <Next.Menu.CheckboxItem value='grid' checked={grid} onCheckedChange={setGrid} shortcut='⌘G'>
            Show grid
          </Next.Menu.CheckboxItem>
          <Next.Menu.RadioGroup value={sort} onValueChange={({ value }) => setSort(value)}>
            <Next.Menu.ItemGroupLabel>Sort</Next.Menu.ItemGroupLabel>
            <Next.Menu.RadioItem value='name'>Name</Next.Menu.RadioItem>
            <Next.Menu.RadioItem value='date'>Date</Next.Menu.RadioItem>
          </Next.Menu.RadioGroup>
          <Next.Menu.Separator />
          <Next.Menu.Sub>
            <Next.Menu.SubTrigger icon='ph--share--regular'>Share</Next.Menu.SubTrigger>
            <Next.Menu.Content size={size}>
              <Next.Menu.Item value='email'>Email</Next.Menu.Item>
              <Next.Menu.Item value='link'>Copy link</Next.Menu.Item>
            </Next.Menu.Content>
          </Next.Menu.Sub>
        </Next.Menu.Content>
      </Next.Menu.Root>
      <Next.Menu.Root onSelect={({ value }) => setSelected(value)}>
        <Next.Menu.ContextTrigger asChild>
          <Next.Typography data-testid={`context-${size}`}>Right-click here</Next.Typography>
        </Next.Menu.ContextTrigger>
        <Next.Menu.Content size={size}>
          <Next.Menu.Item value='rename'>Rename</Next.Menu.Item>
        </Next.Menu.Content>
      </Next.Menu.Root>
      <Next.Group>
        <Next.Button onClick={() => setAnchored(true)} data-testid={`open-anchored-${size}`}>
          Open at anchor
        </Next.Button>
        <Next.Typography asChild>
          <span ref={anchor} data-testid={`anchor-${size}`}>
            Anchor
          </span>
        </Next.Typography>
      </Next.Group>
      <Next.Menu.Root
        open={anchored}
        onOpenChange={({ open }) => setAnchored(open)}
        onSelect={({ value }) => setSelected(value)}
        positioning={{ getAnchorRect: () => anchor.current?.getBoundingClientRect() ?? null }}
      >
        <Next.Menu.Content size={size} arrow data-testid={`anchored-${size}`}>
          <Next.Menu.Item value='pin'>Pin</Next.Menu.Item>
        </Next.Menu.Content>
      </Next.Menu.Root>
      <Next.Typography data-testid={`selected-${size}`}>
        {selected ? `Selected: ${selected}` : 'Nothing selected'}
      </Next.Typography>
      <Next.Typography data-testid={`options-${size}`}>
        grid {grid ? 'on' : 'off'}, sort by {sort}
      </Next.Typography>
    </>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/menu',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Opens the menu from its trigger and returns it once it has focus. */
const open = async (canvasElement: HTMLElement) => {
  await userEvent.click(byTestId(canvasElement, 'trigger-md'));
  const menu = await within(canvasElement.ownerDocument.body).findByRole('menu');
  await waitFor(() => expect(menu).toHaveFocus());
  return menu;
};

const highlighted = (menu: HTMLElement) => menu.querySelector('[data-highlighted]')?.textContent;

export const Default: Story = {};

/**
 * Escape closes the menu and returns focus to the trigger. Arrow keys move the highlight, skipping disabled items, and
 * Enter selects. Checkbox and radio items report `aria-checked` and update the caller's state, their labels aligned
 * by a leading indicator cell; a SubTrigger opens its nested menu beside it on ArrowRight. A ContextTrigger opens its
 * menu at the pointer; a menu without a trigger anchors to `positioning.getAnchorRect`. The story ends with the menu
 * open.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    await open(canvasElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());
    await waitFor(() => expect(byTestId(canvasElement, 'trigger-md')).toHaveFocus());

    const trigger = byTestId(canvasElement, 'trigger-md');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    let menu = await open(canvasElement);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toHaveAttribute('data-surface', 'popup');
    await expect(menu).toHaveAttribute('data-size', 'md');
    await expect(within(menu).getByRole('group', { name: 'Edit' })).toBeInTheDocument();
    await expect(within(menu).getAllByRole('menuitem')).toHaveLength(6);
    await expect(within(menu).getAllByRole('separator')).toHaveLength(3);
    await expect(within(menu).getByRole('menuitemcheckbox', { name: /Show grid/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(within(menu).getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
    await expect(within(menu).getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'false');
    // Option items keep their labels in line with each other, checked or not.
    const labelLeft = (name: RegExp | string, role: string) =>
      within(menu).getByRole(role, { name }).querySelector('[data-part="item-text"]')?.getBoundingClientRect().left;
    await expect(labelLeft('Name', 'menuitemradio')).toBeCloseTo(labelLeft('Date', 'menuitemradio') ?? 0, 0);
    await expect(labelLeft(/Show grid/, 'menuitemcheckbox')).toBeCloseTo(labelLeft('Date', 'menuitemradio') ?? 0, 0);

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
    await waitFor(() => expect(highlighted(menu)).toContain('Share'));

    // ArrowRight opens the nested menu beside its trigger item; ArrowLeft returns to the parent.
    await userEvent.keyboard('{ArrowRight}');
    const body = within(canvasElement.ownerDocument.body);
    await waitFor(() => expect(body.getAllByRole('menu')).toHaveLength(2));
    const sub = body.getAllByRole('menu').find((element) => element !== menu);
    if (!sub) {
      throw new Error('missing submenu');
    }
    await expect(within(sub).getAllByRole('menuitem')).toHaveLength(2);
    const share = within(menu).getByRole('menuitem', { name: 'Share' });
    await expect(share).toHaveAttribute('aria-haspopup', 'menu');
    await waitFor(() =>
      expect(sub.getBoundingClientRect().left).toBeGreaterThanOrEqual(menu.getBoundingClientRect().right - 1),
    );
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(body.getAllByRole('menu')).toHaveLength(1));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(highlighted(menu)).toContain('Cut'));
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    await waitFor(() => expect(highlighted(menu)).toContain('Paste'));

    // Enter selects the highlighted item and closes the menu.
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(byTestId(canvasElement, 'selected-md')).toHaveTextContent('Selected: paste'));
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // Checkbox and radio items update the caller's state.
    menu = await open(canvasElement);
    await userEvent.click(within(menu).getByRole('menuitemcheckbox', { name: /Show grid/ }));
    await waitFor(() => expect(byTestId(canvasElement, 'options-md')).toHaveTextContent('grid off'));
    menu = await open(canvasElement);
    await userEvent.click(within(menu).getByRole('menuitemradio', { name: 'Date' }));
    await waitFor(() => expect(byTestId(canvasElement, 'options-md')).toHaveTextContent('sort by date'));
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // A context menu opens at the pointer.
    const context = byTestId(canvasElement, 'context-md');
    const { left, top } = context.getBoundingClientRect();
    fireEvent.contextMenu(context, { clientX: left + 10, clientY: top + 5 });
    const contextMenu = await within(canvasElement.ownerDocument.body).findByRole('menu');
    await expect(within(contextMenu).getByRole('menuitem', { name: 'Rename' })).toBeInTheDocument();
    await waitFor(() => expect(contextMenu.getBoundingClientRect().left).toBeCloseTo(left + 10, -1));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // A virtual trigger: opened under control and anchored to another element's rect, with an arrow.
    await userEvent.click(byTestId(canvasElement, 'open-anchored-md'));
    const anchored = await within(canvasElement.ownerDocument.body).findByTestId('anchored-md');
    await expectAnchoredBelow(byTestId(canvasElement, 'anchor-md'), anchored);
    await expectArrow(byTestId(canvasElement, 'anchor-md'), anchored);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // Reopen so the story rests on the menu.
    menu = await open(canvasElement);
    await expect(menu).toBeVisible();
  },
};
