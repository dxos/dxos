//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing';
import { IconButton } from '../Button';
import { Toolbar } from '../Toolbar';
import { Main, type MainRootProps } from './Main.tsx';
import { useSidebars } from './MainContext.ts';

type StoryMainArgs = Pick<MainRootProps, 'defaultNavigationSidebarState' | 'defaultComplementarySidebarState'>;

const NavigationSidebarToggle = ({ close }: { close?: boolean }) => {
  const { toggleNavigationSidebar } = useSidebars('StoryMain__SidebarToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-left--regular' : 'ph--caret-right--regular'}
      iconOnly
      label='Toggle navigation sidebar'
      onClick={toggleNavigationSidebar}
    />
  );
};

const ComplementarySidebarToggle = ({ close }: { close?: boolean }) => {
  const { toggleComplementarySidebar } = useSidebars('StoryMain__SidebarToggle');
  return (
    <IconButton
      icon={close ? 'ph--caret-right--regular' : 'ph--caret-left--regular'}
      iconOnly
      label='Toggle complementary sidebar'
      onClick={toggleComplementarySidebar}
    />
  );
};

const DefaultStory = ({
  defaultNavigationSidebarState = 'closed',
  defaultComplementarySidebarState = 'closed',
}: StoryMainArgs) => {
  return (
    <Main.Root
      defaultNavigationSidebarState={defaultNavigationSidebarState}
      defaultComplementarySidebarState={defaultComplementarySidebarState}
    >
      <Main.Overlay />
      <Main.NavigationSidebar label='Navigation'>
        <Toolbar.Root>
          <h1>Navigation</h1>
          <Toolbar.Separator />
          <NavigationSidebarToggle close />
        </Toolbar.Root>
        <p className='p-4'>Swipe toward the edge to dismiss.</p>
      </Main.NavigationSidebar>
      <Main.Content classNames='w-full'>
        <Toolbar.Root>
          <NavigationSidebarToggle />
          <div className='flex items-center grow justify-center'>Main</div>
          <ComplementarySidebarToggle />
        </Toolbar.Root>
      </Main.Content>
      <Main.ComplementarySidebar label='Complementary'>
        <Toolbar.Root>
          <ComplementarySidebarToggle close />
          <Toolbar.Separator />
          <h1>Complementary</h1>
        </Toolbar.Root>
        <p className='p-4'>Swipe toward the edge to dismiss.</p>
      </Main.ComplementarySidebar>
    </Main.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Main',
  component: Main.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

/** The toggles drive the sidebar states, which the sidebars carry as data attributes. */
export const TestToggle: Story = {
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvasElement.querySelector<HTMLElement>('[data-side="is"]')?.getAttribute('data-state')).toBe(
      'closed',
    );
    await expect(canvasElement.querySelector<HTMLElement>('[data-side="is"]')?.hasAttribute('inert')).toBe(true);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Toggle navigation sidebar' })[1]);
    await waitFor(async () =>
      expect(canvasElement.querySelector<HTMLElement>('[data-side="is"]')?.getAttribute('data-state')).toBe('expanded'),
    );
    await expect(canvasElement.querySelector<HTMLElement>('[data-side="is"]')?.hasAttribute('inert')).toBe(false);
    await userEvent.click(canvas.getAllByRole('button', { name: 'Toggle navigation sidebar' })[0]);
    await waitFor(async () =>
      expect(canvasElement.querySelector<HTMLElement>('[data-side="is"]')?.getAttribute('data-state')).toBe('closed'),
    );
  },
};

const pointer = (type: string, target: EventTarget, x: number, y: number) =>
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: x,
      clientY: y,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    }),
  );

const tick = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Below `lg` the sidebars are the drawer machine's content; at `lg` they are plain landmarks. The
 * viewport persists across the file's stories, so it is restored after the play.
 */
const narrow = async (play: () => Promise<void>) => {
  const { page } = await import('@vitest/browser/context');
  const { innerWidth, innerHeight } = window;
  await page.viewport(800, 600);
  try {
    await play();
  } finally {
    await page.viewport(innerWidth, innerHeight);
  }
};

const query = (canvasElement: HTMLElement, selector: string) =>
  waitFor(() => {
    const element = canvasElement.querySelector<HTMLElement>(selector);
    if (!element) {
      throw new Error(`Not rendered: ${selector}`);
    }
    return element;
  });

const sidebarOf = (canvasElement: HTMLElement, side: 'is' | 'ie') =>
  query(canvasElement, `[data-side="${side}"][role="dialog"]`);

/** Swiping a sidebar a third of its width toward its edge closes it; the other sidebar stays open. */
const swipeToDismiss = async (canvasElement: HTMLElement, side: 'is' | 'ie') => {
  const sidebar = await sidebarOf(canvasElement, side);
  // Let the inset slide finish so the machine measures the open extent.
  await tick(400);
  const rect = sidebar.getBoundingClientRect();
  const paragraph = within(sidebar).getByText('Swipe toward the edge to dismiss.');
  const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  const direction = side === 'is' ? -1 : 1;
  const distance = rect.width / 3;
  pointer('pointerdown', paragraph, start.x, start.y);
  await tick(16);
  for (let step = 1; step <= 12; step++) {
    pointer('pointermove', paragraph, start.x + (direction * distance * step) / 12, start.y);
    await tick(16);
  }
  // Mid-drag the machine owns the panel's position through its inline transform.
  await expect(sidebar.hasAttribute('data-dragging')).toBe(true);
  await expect(sidebar.style.getPropertyValue('--drawer-translate-x')).not.toBe('0px');
  pointer('pointerup', paragraph, start.x + direction * distance, start.y);
  // A dismissal returns the sidebar to its resting state, not to `closed`.
  await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('collapsed'));
  await waitFor(() => expect(sidebar.hasAttribute('data-dragging')).toBe(false));
};

/** Both open at once (a click outside one would close it, so they open together on mount). */
export const TestSwipeToDismiss: Story = {
  args: { defaultNavigationSidebarState: 'expanded', defaultComplementarySidebarState: 'expanded' },
  play: ({ canvasElement }) =>
    narrow(async () => {
      await swipeToDismiss(canvasElement, 'is');
      // Closing one sidebar does not dismiss the other through the layer stack.
      await expect(canvasElement.querySelector('[data-side="ie"]')?.getAttribute('data-state')).toBe('expanded');
      await swipeToDismiss(canvasElement, 'ie');
    }),
};

/** A short drag snaps back instead of closing. */
export const TestSwipeSnapBack: Story = {
  play: ({ canvasElement }) =>
    narrow(async () => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getAllByRole('button', { name: 'Toggle navigation sidebar' })[1]);
      const sidebar = await sidebarOf(canvasElement, 'is');
      await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('expanded'));
      await tick(400);

      const rect = sidebar.getBoundingClientRect();
      const paragraph = within(sidebar).getByText('Swipe toward the edge to dismiss.');
      const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      pointer('pointerdown', paragraph, start.x, start.y);
      for (let step = 1; step <= 6; step++) {
        pointer('pointermove', paragraph, start.x - step * 4, start.y);
        await tick(40);
      }
      pointer('pointerup', paragraph, start.x - 24, start.y);

      await tick(400);
      await expect(sidebar.getAttribute('data-state')).toBe('expanded');
      await expect(sidebar.style.getPropertyValue('--drawer-translate-x')).toBe('0px');
    }),
};

/** A touch swipe inward from the edge opens the sidebar resting `collapsed`, the deck's default below `lg`. */
export const TestSwipeToOpen: Story = {
  args: { defaultNavigationSidebarState: 'collapsed' },
  play: ({ canvasElement }) =>
    narrow(async () => {
      const sidebar = await sidebarOf(canvasElement, 'is');
      await expect(sidebar.getAttribute('data-state')).toBe('collapsed');
      const swipeArea = await query(canvasElement, '[data-part="swipe-area"][data-swipe-direction="right"]');

      const start = { x: 4, y: 300 };
      const touch = new Touch({ identifier: 1, target: swipeArea, clientX: start.x, clientY: start.y });
      swipeArea.dispatchEvent(
        new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [touch], targetTouches: [touch] }),
      );
      await tick(16);
      const distance = 240;
      for (let step = 1; step <= 12; step++) {
        pointer('pointermove', swipeArea, start.x + (distance * step) / 12, start.y);
        await tick(16);
      }
      pointer('pointerup', swipeArea, start.x + distance, start.y);
      await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('expanded'));
    }),
};
