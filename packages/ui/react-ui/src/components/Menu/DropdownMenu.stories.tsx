//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { DropdownMenu } from './DropdownMenu';

const DefaultStory = () => {
  return (
    <DropdownMenu.Root defaultOpen>
      <DropdownMenu.Trigger asChild>
        <Button>Customise options</Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
        <DropdownMenu.Viewport>
          <DropdownMenu.Item>
            <span className='grow'>New Tab</span>
            <span className='opacity-50'>⌘+T</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item>
            <span className='grow'>New Window</span>
            <span className='opacity-50'>⌘+N</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled>
            <span className='grow'>New Private Window</span>
            <span className='opacity-50'>⇧+⌘+N</span>
          </DropdownMenu.Item>
          {/* <DropdownMenu.Sub> */}
          {/*  <DropdownMenu.SubTrigger> */}
          {/*    More Tools */}
          {/*    <div> */}
          {/*      <ChevronRightIcon /> */}
          {/*    </div> */}
          {/*  </DropdownMenu.SubTrigger> */}
          {/*  <DropdownMenu.Portal> */}
          {/*    <DropdownMenu.SubContent sideOffset={2} alignOffset={-5}> */}
          {/*      <DropdownMenu.Item> */}
          {/*        Save Page As… <div>⌘+S</div> */}
          {/*      </DropdownMenu.Item> */}
          {/*      <DropdownMenu.Item>Create Shortcut…</DropdownMenu.Item> */}
          {/*      <DropdownMenu.Item>Name Window…</DropdownMenu.Item> */}
          {/*      <DropdownMenu.Separator /> */}
          {/*      <DropdownMenu.Item>Developer Tools</DropdownMenu.Item> */}
          {/*    </DropdownMenu.SubContent> */}
          {/*  </DropdownMenu.Portal> */}
          {/* </DropdownMenu.Sub> */}

          {/* <DropdownMenu.Separator /> */}

          {/* <DropdownMenu.CheckboxItem checked={bookmarksChecked} onCheckedChange={setBookmarksChecked}> */}
          {/*  <DropdownMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </DropdownMenu.ItemIndicator> */}
          {/*  Show Bookmarks <div>⌘+B</div> */}
          {/* </DropdownMenu.CheckboxItem> */}
          {/* <DropdownMenu.CheckboxItem checked={urlsChecked} onCheckedChange={setUrlsChecked}> */}
          {/*  <DropdownMenu.ItemIndicator> */}
          {/*    <CheckIcon /> */}
          {/*  </DropdownMenu.ItemIndicator> */}
          {/*  Show Full URLs */}
          {/* </DropdownMenu.CheckboxItem> */}

          <DropdownMenu.Separator />

          <DropdownMenu.GroupLabel>People</DropdownMenu.GroupLabel>
          {/* <DropdownMenu.RadioGroup value={person} onValueChange={setPerson}> */}
          {/*  <DropdownMenu.RadioItem value='pedro'> */}
          {/*    <DropdownMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </DropdownMenu.ItemIndicator> */}
          {/*    Pedro Duarte */}
          {/*  </DropdownMenu.RadioItem> */}
          {/*  <DropdownMenu.RadioItem value='colm'> */}
          {/*    <DropdownMenu.ItemIndicator> */}
          {/*      <DotFilledIcon /> */}
          {/*    </DropdownMenu.ItemIndicator> */}
          {/*    Colm Tuite */}
          {/*  </DropdownMenu.RadioItem> */}
          {/* </DropdownMenu.RadioGroup> */}
        </DropdownMenu.Viewport>

        <DropdownMenu.Arrow />
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/DropdownMenu',
  component: DropdownMenu.Root,
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
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenu.VirtualTrigger virtualRef={buttonRef} />
          <DropdownMenu.Content sideOffset={4} collisionPadding={8}>
            <DropdownMenu.Viewport>
              <DropdownMenu.Item>
                <span className='grow'>New Tab</span>
                <span className='opacity-50'>⌘+T</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item>
                <span className='grow'>New Window</span>
                <span className='opacity-50'>⌘+N</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item disabled>
                <span className='grow'>New Private Window</span>
                <span className='opacity-50'>⇧+⌘+N</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator />

              <DropdownMenu.GroupLabel>People</DropdownMenu.GroupLabel>
            </DropdownMenu.Viewport>

            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Root>
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
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button>Open menu</Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content>
              <DropdownMenu.Viewport>
                <DropdownMenu.Item onSelect={() => setPicked((items) => [...items, 'one'])}>One</DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    setPicked((items) => [...items, 'sticky']);
                  }}
                >
                  Sticky
                </DropdownMenu.Item>
              </DropdownMenu.Viewport>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
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
