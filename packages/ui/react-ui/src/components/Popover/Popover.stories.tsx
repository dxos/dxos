//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, type ReactNode, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Popover } from './Popover';

random.seed(1234);

const DefaultStory = ({ openTrigger, children }: PropsWithChildren<{ openTrigger: ReactNode }>) => {
  return (
    <Popover.Root defaultOpen>
      <Popover.Trigger asChild>{openTrigger}</Popover.Trigger>
      <Popover.Content>
        <Popover.Viewport>
          <p className='px-2 py-1 min-w-[18rem] max-w-[38rem]'>{children}</p>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Popover',
  component: Popover.Root,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    openTrigger: <Button>Open popover</Button>,
    children: random.lorem.paragraphs(3),
  },
};

export const VirtualTrigger = {
  render: () => {
    const [open, setOpen] = useState(true);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    return (
      <>
        <Button onClick={() => setOpen(true)} ref={buttonRef}>
          Open popover
        </Button>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.VirtualTrigger virtualRef={buttonRef} />
          <Popover.Content>
            <Popover.Viewport>
              <p className='px-2 py-1 min-w-[18rem] max-w-[38rem]'>{random.lorem.paragraphs(3)}</p>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </>
    );
  },
};

const near = (rect: DOMRect, anchor: DOMRect) =>
  Math.abs(rect.left + rect.width / 2 - (anchor.left + anchor.width / 2)) < anchor.width + rect.width;

/** Opens from the trigger, sits beside it, and closes on Escape with focus back on the trigger. */
export const TestOpenClose: StoryObj = {
  render: () => (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button>Open popover</Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport>
            <p className='px-2 py-1'>Popover body</p>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  ),
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: 'Open popover' });
    await expect(document.querySelector('[role="dialog"]')).toBeNull();
    await userEvent.click(trigger);
    const dialog = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(element).not.toBeNull();
      return element!;
    });
    await expect(dialog.textContent).toContain('Popover body');
    await expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await waitFor(() => {
      const rect = dialog.getBoundingClientRect();
      expect(rect.width).toBeGreaterThan(0);
      expect(near(rect, trigger.getBoundingClientRect())).toBe(true);
    });
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await expect(trigger.getAttribute('aria-expanded')).toBe('false');
  },
};

/** A virtual anchor places the content at an element that is not the trigger. */
export const TestVirtualAnchor: StoryObj = {
  render: () => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    return (
      <div className='flex flex-col gap-32'>
        <Button ref={buttonRef}>Anchor</Button>
        <Popover.Root defaultOpen>
          <Popover.VirtualTrigger virtualRef={buttonRef} />
          <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
            <Popover.Viewport>
              <p className='px-2 py-1'>Anchored body</p>
            </Popover.Viewport>
          </Popover.Content>
        </Popover.Root>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const anchor = within(canvasElement).getByRole('button', { name: 'Anchor' });
    const dialog = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('[role="dialog"]');
      expect(element).not.toBeNull();
      return element!;
    });
    await waitFor(() => expect(near(dialog.getBoundingClientRect(), anchor.getBoundingClientRect())).toBe(true));
    // Auto focus was vetoed, so the anchor keeps focus rather than the content taking it.
    await expect(dialog.contains(document.activeElement)).toBe(false);
  },
};
