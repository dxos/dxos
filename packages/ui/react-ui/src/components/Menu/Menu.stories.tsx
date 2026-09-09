//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Icon } from '../Icon';
import { Menu } from './Menu';

/** Every part: plain, disabled and shortcut items, a submenu, checkbox items and a radio group. */
const MenuParts = () => {
  const [bookmarks, setBookmarks] = useState(true);
  const [urls, setUrls] = useState(false);
  const [person, setPerson] = useState('pedro');
  return (
    <>
      <Menu.Viewport>
        <Menu.Item>
          <span className='grow'>New Tab</span>
          <span className='opacity-50'>⌘+T</span>
        </Menu.Item>
        <Menu.Item>
          <span className='grow'>New Window</span>
          <span className='opacity-50'>⌘+N</span>
        </Menu.Item>
        <Menu.Item disabled>
          <span className='grow'>New Private Window</span>
          <span className='opacity-50'>⇧+⌘+N</span>
        </Menu.Item>
        <Menu.Sub>
          <Menu.SubTrigger>
            <span className='grow'>More Tools</span>
            <Icon icon='ph--caret-right--regular' size={4} />
          </Menu.SubTrigger>
          <Menu.Portal>
            <Menu.SubContent>
              <Menu.Viewport>
                <Menu.Item>
                  <span className='grow'>Save Page As…</span>
                  <span className='opacity-50'>⌘+S</span>
                </Menu.Item>
                <Menu.Item>Create Shortcut…</Menu.Item>
                <Menu.Item>Name Window…</Menu.Item>
                <Menu.Separator />
                <Menu.Item>Developer Tools</Menu.Item>
              </Menu.Viewport>
            </Menu.SubContent>
          </Menu.Portal>
        </Menu.Sub>

        <Menu.Separator />

        {/* A toggle keeps the menu open, so several can be set in one visit. */}
        <Menu.CheckboxItem checked={bookmarks} onCheckedChange={setBookmarks} closeOnSelect={false}>
          <Menu.ItemIndicator>
            <Icon icon='ph--check--regular' size={4} />
          </Menu.ItemIndicator>
          <span className='grow'>Show Bookmarks</span>
          <span className='opacity-50'>⌘+B</span>
        </Menu.CheckboxItem>
        <Menu.CheckboxItem checked={urls} onCheckedChange={setUrls} closeOnSelect={false}>
          <Menu.ItemIndicator>
            <Icon icon='ph--check--regular' size={4} />
          </Menu.ItemIndicator>
          Show Full URLs
        </Menu.CheckboxItem>

        <Menu.Separator />

        <Menu.GroupLabel>People</Menu.GroupLabel>
        <Menu.RadioGroup value={person} onValueChange={setPerson}>
          <Menu.RadioItem value='pedro' closeOnSelect={false}>
            <Menu.ItemIndicator>
              <Icon icon='ph--dot--bold' size={4} />
            </Menu.ItemIndicator>
            Pedro Duarte
          </Menu.RadioItem>
          <Menu.RadioItem value='colm' closeOnSelect={false}>
            <Menu.ItemIndicator>
              <Icon icon='ph--dot--bold' size={4} />
            </Menu.ItemIndicator>
            Colm Tuite
          </Menu.RadioItem>
        </Menu.RadioGroup>
      </Menu.Viewport>

      <Menu.Arrow />
    </>
  );
};

const DefaultStory = () => {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger asChild>
        <Button>Customise options</Button>
      </Menu.Trigger>
      <Menu.Content sideOffset={4} collisionPadding={8}>
        <MenuParts />
      </Menu.Content>
    </Menu.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Menu',
  component: Menu.Root,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

/** The same root and parts, opened from a context trigger: right-click or long-tap. */
export const ContextTrigger: Story = {
  render: () => (
    <Menu.Root>
      {/* `select-none`: a long-tap would otherwise select the text on some platforms. */}
      <Menu.ContextTrigger className='select-none border border-dashed border-neutral-400/50 rounded-md flex items-center justify-center p-8 font-normal'>
        Right-click / long-tap here.
      </Menu.ContextTrigger>
      <Menu.Content collisionPadding={8}>
        <MenuParts />
      </Menu.Content>
    </Menu.Root>
  ),
};

/** A checkbox item toggles and stays checked, a radio item moves the selection, a submenu opens from its trigger. */
export const TestParts: Story = {
  play: async () => {
    const menu = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('[role="menu"]');
      if (!element) {
        throw new Error('menu not open');
      }
      return element;
    });
    const bookmarks = within(menu).getByRole('menuitemcheckbox', { name: /Show Bookmarks/ });
    await expect(bookmarks).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(bookmarks);
    await waitFor(() => expect(bookmarks).toHaveAttribute('aria-checked', 'false'));

    const colm = within(menu).getByRole('menuitemradio', { name: 'Colm Tuite' });
    await expect(colm).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(colm);
    await waitFor(() => expect(colm).toHaveAttribute('aria-checked', 'true'));

    await userEvent.hover(within(menu).getByRole('menuitem', { name: /More Tools/ }));
    await waitFor(() =>
      expect(document.querySelector('[role="menuitem"][aria-haspopup]')).toHaveAttribute('aria-expanded', 'true'),
    );
    await waitFor(() => expect(document.querySelectorAll('[role="menu"]').length).toBe(2));
  },
};

export const VirtualTrigger = {
  render: () => {
    const [menuOpen, setMenuOpen] = useState(true);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    return (
      <>
        <Button onClick={() => setMenuOpen(true)} ref={buttonRef}>
          Customise options
        </Button>
        <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <Menu.VirtualTrigger virtualRef={buttonRef} />
          <Menu.Content sideOffset={4} collisionPadding={8}>
            <Menu.Viewport>
              <Menu.Item>
                <span className='grow'>New Tab</span>
                <span className='opacity-50'>⌘+T</span>
              </Menu.Item>
              <Menu.Item>
                <span className='grow'>New Window</span>
                <span className='opacity-50'>⌘+N</span>
              </Menu.Item>
              <Menu.Item disabled>
                <span className='grow'>New Private Window</span>
                <span className='opacity-50'>⇧+⌘+N</span>
              </Menu.Item>

              <Menu.Separator />

              <Menu.GroupLabel>People</Menu.GroupLabel>
            </Menu.Viewport>

            <Menu.Arrow />
          </Menu.Content>
        </Menu.Root>
      </>
    );
  },
};

/**
 * Opens from the trigger, lists menu items, selects one on Enter (closing), and stays open when an
 * item's `onSelect` calls `preventDefault()` — the multi-select contract react-ui-menu relies on.
 */
export const TestSelect: StoryObj = {
  render: () => {
    const [picked, setPicked] = useState<string[]>([]);
    return (
      <div className='flex flex-col gap-2'>
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button>Open menu</Button>
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content>
              <Menu.Viewport>
                <Menu.Item onSelect={() => setPicked((items) => [...items, 'one'])}>One</Menu.Item>
                <Menu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    setPicked((items) => [...items, 'sticky']);
                  }}
                >
                  Sticky
                </Menu.Item>
              </Menu.Viewport>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
        <span data-testid='picked'>{picked.join(',')}</span>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Open menu' });
    await expect(document.querySelector('[role="menu"]')).toBeNull();
    await userEvent.click(trigger);
    await waitFor(() => expect(document.querySelectorAll('[role^="menuitem"]').length).toBe(2));
    await expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // A sticky item keeps the menu open.
    await userEvent.click(document.querySelectorAll<HTMLElement>('[role^="menuitem"]')[1]);
    await waitFor(() => expect(canvas.getByTestId('picked').textContent).toBe('sticky'));
    await expect(document.querySelector('[role="menu"]')).not.toBeNull();

    // A plain item selects and closes; keyboard reaches it too.
    await userEvent.keyboard('{ArrowUp}{Enter}');
    await waitFor(() => expect(canvas.getByTestId('picked').textContent).toBe('sticky,one'));
    await waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
  },
};
