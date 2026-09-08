//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Menu } from './Menu';

const DefaultStory = () => {
  return (
    <Menu.Root defaultOpen>
      <Menu.Trigger asChild>
        <Button>Customise options</Button>
      </Menu.Trigger>

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
          {/* <Menu.Sub> */}
          {/*  <Menu.SubTrigger> */}
          {/*    More Tools */}
          {/*    <div> */}
          {/*      <ChevronRightIcon /> */}
          {/*    </div> */}
          {/*  </Menu.SubTrigger> */}
          {/*  <Menu.Portal> */}
          {/*    <Menu.SubContent sideOffset={2} alignOffset={-5}> */}
          {/*      <Menu.Item> */}
          {/*        Save Page As… <div>⌘+S</div> */}
          {/*      </Menu.Item> */}
          {/*      <Menu.Item>Create Shortcut…</Menu.Item> */}
          {/*      <Menu.Item>Name Window…</Menu.Item> */}
          {/*      <Menu.Separator /> */}
          {/*      <Menu.Item>Developer Tools</Menu.Item> */}
          {/*    </Menu.SubContent> */}
          {/*  </Menu.Portal> */}
          {/* </Menu.Sub> */}

          {/* <Menu.Separator /> */}

          {/* <Menu.CheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
          {/*  <Menu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </Menu.ItemIndicator> */}
          {/*  Show Bookmarks <div>⌘+B</div> */}
          {/* </Menu.CheckboxItem> */}
          {/* <Menu.CheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
          {/*  <Menu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </Menu.ItemIndicator> */}
          {/*  Show Full URLs */}
          {/* </Menu.CheckboxItem> */}

          <Menu.Separator />

          <Menu.GroupLabel>People</Menu.GroupLabel>
          {/* <Menu.RadioGroup value={person} onValueChange={setPerson}> */}
          {/*  <Menu.RadioItem value='pedro'> */}
          {/*    <Menu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </Menu.ItemIndicator> */}
          {/*    Pedro Duarte */}
          {/*  </Menu.RadioItem> */}
          {/*  <Menu.RadioItem value='colm'> */}
          {/*    <Menu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </Menu.ItemIndicator> */}
          {/*    Colm Tuite */}
          {/*  </Menu.RadioItem> */}
          {/* </Menu.RadioGroup> */}
        </Menu.Viewport>

        <Menu.Arrow />
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
