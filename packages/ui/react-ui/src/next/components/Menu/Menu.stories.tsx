//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, fireEvent, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type Size, SIZES } from '../../sizes.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { byTestId, expectAnchoredBelow, expectArrow, expectScrollingPopup, popupFrame } from '../../testing.ts';

/** A menu tree three levels deep, rendered recursively as nested `Menu.Sub`s. */
type MenuNode = { value: string; label: string; icon?: string; children?: MenuNode[] };

const HIERARCHY: MenuNode[] = [
  {
    value: 'new',
    label: 'New',
    icon: 'ph--plus--regular',
    children: [
      { value: 'new-document', label: 'Document', icon: 'ph--file-text--regular' },
      { value: 'new-sheet', label: 'Sheet', icon: 'ph--table--regular' },
      {
        value: 'new-diagram',
        label: 'Diagram',
        icon: 'ph--flow-arrow--regular',
        children: [
          { value: 'new-flowchart', label: 'Flowchart' },
          { value: 'new-sequence', label: 'Sequence' },
        ],
      },
    ],
  },
  {
    value: 'export',
    label: 'Export',
    icon: 'ph--export--regular',
    children: [
      { value: 'export-pdf', label: 'PDF' },
      { value: 'export-png', label: 'PNG' },
      { value: 'export-markdown', label: 'Markdown' },
    ],
  },
  { value: 'close', label: 'Close', icon: 'ph--x--regular' },
];

const MenuNodes = ({ nodes, size }: { nodes: MenuNode[]; size: Size }) => (
  <>
    {nodes.map(({ value, label, icon, children }) =>
      children ? (
        <Next.Menu.Sub key={value}>
          <Next.Menu.SubTrigger icon={icon} data-testid={`sub-${value}`}>
            {label}
          </Next.Menu.SubTrigger>
          <Next.Menu.Content size={size}>
            <MenuNodes nodes={children} size={size} />
          </Next.Menu.Content>
        </Next.Menu.Sub>
      ) : (
        <Next.Menu.Item key={value} value={value} icon={icon}>
          {label}
        </Next.Menu.Item>
      ),
    )}
  </>
);

/** Enough items to overflow the popup's 20rem cap at every size. */
const LONG = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`);

/**
 * A menu of items, groups, a checkbox item, a radio group and a nested menu; a three-level File hierarchy; a long menu
 * that scrolls; a region with a
 * context menu; and a menu with no trigger, opened under control and anchored to a text span (a virtual trigger) with
 * an arrow.
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
        <Next.Menu.Trigger asChild>
          <Next.Button data-testid={`file-${size}`}>File</Next.Button>
        </Next.Menu.Trigger>
        <Next.Menu.Content size={size}>
          <MenuNodes nodes={HIERARCHY} size={size} />
        </Next.Menu.Content>
      </Next.Menu.Root>
      <Next.Menu.Root onSelect={({ value }) => setSelected(value)}>
        <Next.Menu.Trigger asChild>
          <Next.Button data-testid={`long-${size}`}>Long</Next.Button>
        </Next.Menu.Trigger>
        <Next.Menu.Content size={size}>
          {LONG.map((label) => (
            <Next.Menu.Item key={label} value={label}>
              {label}
            </Next.Menu.Item>
          ))}
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
  title: 'ui/react-ui-core/next/components/Menu',
  render: DefaultStory,
  decorators: [withSizes(), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
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
 * menu at the pointer; a menu without a trigger anchors to `positioning.getAnchorRect`. A long menu scrolls in a
 * thin ScrollArea with no native bar, keeping the highlight in view. The story ends with the menu open.
 */
export const Test: Story = {
  args: { allSizes: true },
  play: async ({ canvasElement }) => {
    // At every size the hierarchy opens level by level from the keyboard, each submenu beside its trigger row with its
    // first item level with that row, and a third-level leaf reports to the root's `onSelect`.
    const page = within(canvasElement.ownerDocument.body);
    const beside = async (triggerName: string, itemName: string) => {
      const triggerItem = page.getByRole('menuitem', { name: triggerName });
      await waitFor(() => expect(page.getByRole('menuitem', { name: itemName })).toBeVisible());
      const first = page.getByRole('menuitem', { name: itemName });
      const submenu = first.closest<HTMLElement>('[role="menu"]');
      await expect(triggerItem).toHaveAttribute('aria-expanded', 'true');
      await waitFor(() => {
        const triggerRect = triggerItem.getBoundingClientRect();
        const subRect = popupFrame(submenu ?? first).getBoundingClientRect();
        const firstRect = first.getBoundingClientRect();
        const where = `submenu ${JSON.stringify(subRect)}, first ${JSON.stringify(firstRect)}, trigger ${JSON.stringify(triggerRect)}`;
        return expect(
          subRect.left >= triggerRect.right - 1 && Math.abs(firstRect.top - triggerRect.top) <= 0.5,
          where,
        ).toBe(true);
      });
      return submenu;
    };
    for (const size of SIZES) {
      byTestId(canvasElement, `file-${size}`).focus();
      await userEvent.keyboard('{Enter}');
      await waitFor(() => expect(page.getByRole('menuitem', { name: 'New' })).toBeVisible());
      const fileMenu = page.getByRole('menuitem', { name: 'New' }).closest<HTMLElement>('[role="menu"]');
      await waitFor(() => expect(fileMenu).toHaveFocus());
      await userEvent.keyboard('{Home}');
      await waitFor(() => expect(fileMenu && highlighted(fileMenu)).toBe('New'));
      await userEvent.keyboard('{ArrowRight}');
      const newMenu = await beside('New', 'Document');
      await waitFor(() => expect(newMenu).toHaveFocus());
      await waitFor(() => expect(newMenu && highlighted(newMenu)).toBe('Document'));
      await userEvent.keyboard('{ArrowDown}{ArrowDown}');
      await waitFor(() => expect(newMenu && highlighted(newMenu)).toBe('Diagram'));
      await userEvent.keyboard('{ArrowRight}');
      const diagramMenu = await beside('Diagram', 'Flowchart');
      await waitFor(() => expect(diagramMenu && highlighted(diagramMenu)).toBe('Flowchart'));
      await userEvent.keyboard('{Enter}');
      await waitFor(() =>
        expect(byTestId(canvasElement, `selected-${size}`)).toHaveTextContent('Selected: new-flowchart'),
      );
      await waitFor(() => expect(page.queryByRole('menu')).toBeNull());
    }

    await open(canvasElement);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());
    await waitFor(() => expect(byTestId(canvasElement, 'trigger-md')).toHaveFocus());

    const trigger = byTestId(canvasElement, 'trigger-md');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    let menu = await open(canvasElement);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // The ScrollArea frame is the surface; the menu itself is its viewport.
    await expect(popupFrame(menu)).toHaveAttribute('data-surface', 'popup');
    await expect(popupFrame(menu)).toHaveAttribute('data-size', 'md');
    await expect(menu).toHaveAttribute('data-scope', 'menu');
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

    // A long menu scrolls in a thin ScrollArea, and the keyboard highlight stays in view.
    await userEvent.click(byTestId(canvasElement, 'long-md'));
    const long = await within(canvasElement.ownerDocument.body).findByRole('menu');
    await waitFor(() => expect(long).toHaveFocus());
    await expect(popupFrame(long)).toHaveAttribute('data-width', 'thin');
    await expectScrollingPopup(long, 20);
    await waitFor(() => expect(highlighted(long)).toBe('Item 20'));
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole('menu')).toBeNull());

    // A context menu opens at the pointer.
    const context = byTestId(canvasElement, 'context-md');
    const { left, top } = context.getBoundingClientRect();
    await fireEvent.contextMenu(context, { clientX: left + 10, clientY: top + 5 });
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
