//
// Copyright 2026 DXOS.org
//

// THROWAWAY PROBE — does Ark's drawer machine fit `Main`'s sidebars below `lg`? The navigation
// sidebar is mounted on `useDrawer` in place of `useDialog`, with `main.css`'s inset slide left
// as it is; the play function drives a touch swipe toward the edge and expects the sidebar to close.

import { Drawer as DrawerPrimitive, useDrawer } from '@ark-ui/react/drawer';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { useMediaQuery } from '@dxos/react-hooks';

import { useThemeContext } from '../../hooks';
import { withLayout, withTheme } from '../../testing';
import { IconButton } from '../Button';
import { Toolbar } from '../Toolbar';
import { Main } from './Main';
import { useLandmarkMover, useMainContext, useSidebars } from './MainContext';

const SIDEBAR_TEST_ID = 'probe.sidebar';

const ProbeNavigationSidebar = ({ children }: PropsWithChildren) => {
  const [isLg] = useMediaQuery('lg');
  const { tx } = useThemeContext();
  const { navigationSidebarState: state, setNavigationSidebarState, resizing } = useMainContext('Probe');
  const { ref: moverRef, ...mover } = useLandmarkMover(undefined, '0');

  const drawer = useDrawer({
    open: !isLg && state !== 'closed',
    onOpenChange: ({ open }) => {
      if (!open) {
        setNavigationSidebarState('closed');
      }
    },
    modal: false,
    trapFocus: false,
    preventScroll: false,
    restoreFocus: false,
    swipeDirection: 'start',
    closeThreshold: 0.25,
  });

  const sidebarProps = {
    ...mover,
    ...(state === 'closed' && { inert: true }),
    'aria-label': 'Navigation',
    'data-side': 'is',
    'data-state': state,
    'data-resizing': resizing ? 'true' : 'false',
    'data-testid': SIDEBAR_TEST_ID,
    'data-machine-open': drawer.open ? 'true' : 'false',
    'className': tx('main.sidebar', {}),
    'ref': moverRef,
  };

  if (isLg) {
    return <div {...sidebarProps}>{children}</div>;
  }

  return (
    <DrawerPrimitive.RootProvider value={drawer}>
      {/* The machine hides closed content; the CSS slides it out instead, so it stays shown. */}
      <DrawerPrimitive.Content {...sidebarProps} hidden={false}>
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.RootProvider>
  );
};

const NavigationSidebarToggle = () => {
  const { toggleNavigationSidebar } = useSidebars('Probe');
  return (
    <IconButton
      icon='ph--sidebar-simple--regular'
      iconOnly
      label='Toggle navigation sidebar'
      onClick={toggleNavigationSidebar}
    />
  );
};

const DefaultStory = () => (
  <Main.Root defaultComplementarySidebarState='closed' defaultNavigationSidebarState='closed'>
    <Main.Overlay />
    <ProbeNavigationSidebar>
      <Toolbar.Root>
        <h1>Navigation</h1>
      </Toolbar.Root>
      <p className='p-4'>Swipe toward the left edge to dismiss.</p>
    </ProbeNavigationSidebar>
    <Main.Content classNames='w-full'>
      <Toolbar.Root>
        <NavigationSidebarToggle />
        <div className='flex items-center grow justify-center'>Main</div>
      </Toolbar.Root>
    </Main.Content>
  </Main.Root>
);

const meta = {
  title: 'ui/react-ui-core/components/MainDrawerProbe',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

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

/** Below `lg`: open the sidebar, drag it a third of its width toward the edge, release; it closes. */
export const TestSwipeToDismiss: Story = {
  play: async ({ canvasElement }) => {
    const { page } = await import('@vitest/browser/context');
    await page.viewport(800, 600);
    console.log(
      '[probe] viewport',
      JSON.stringify({ width: window.innerWidth, lg: window.matchMedia('(min-width: 1024px)').matches }),
    );

    const canvas = within(canvasElement);
    // Below `lg` the sidebar is a different element (the drawer content replaces the div).
    const sidebar = await waitFor(async () => {
      const element = canvasElement.querySelector<HTMLElement>(`[data-testid="${SIDEBAR_TEST_ID}"]`);
      await expect(element?.getAttribute('role')).toBe('dialog');
      return element!;
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle navigation sidebar' }));
    await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('expanded'));
    // Let the inset slide finish so the machine measures the open extent.
    await tick(400);

    const rect = sidebar.getBoundingClientRect();
    const paragraph = within(sidebar).getByText('Swipe toward the left edge to dismiss.');
    const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    console.log(
      '[probe] before pointerdown',
      JSON.stringify({ machineOpen: sidebar.dataset.machineOpen, active: document.activeElement?.tagName }),
    );
    pointer('pointerdown', paragraph, start.x, start.y);
    await tick(16);
    console.log('[probe] after pointerdown', JSON.stringify({ style: sidebar.style.cssText }));
    const steps = 12;
    const distance = rect.width / 3;
    for (let step = 1; step <= steps; step++) {
      pointer('pointermove', paragraph, start.x - (distance * step) / steps, start.y);
      await tick(16);
    }

    // Mid-drag the machine owns the panel's position through its inline transform.
    const midDrag = {
      dataset: { ...sidebar.dataset },
      style: sidebar.style.cssText,
      transform: sidebar.style.transform,
      translate: sidebar.style.getPropertyValue('--drawer-translate-x'),
      inset: getComputedStyle(sidebar).insetInlineStart,
      rect: rect.toJSON(),
    };
    console.log('[probe] mid-drag', JSON.stringify(midDrag));
    await expect(sidebar.hasAttribute('data-dragging')).toBe(true);
    await expect(midDrag.translate).not.toBe('0px');

    pointer('pointerup', paragraph, start.x - distance, start.y);
    await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('closed'));
    // The machine keeps `data-dragging` until its own close settles, a tick after ours.
    await waitFor(() => expect(sidebar.hasAttribute('data-dragging')).toBe(false));
    console.log(
      '[probe] after release',
      JSON.stringify({ style: sidebar.style.cssText, inset: getComputedStyle(sidebar).insetInlineStart }),
    );
  },
};

/** A short drag snaps back instead of closing. */
export const TestSnapBack: Story = {
  play: async ({ canvasElement }) => {
    const { page } = await import('@vitest/browser/context');
    await page.viewport(800, 600);
    console.log(
      '[probe] viewport',
      JSON.stringify({ width: window.innerWidth, lg: window.matchMedia('(min-width: 1024px)').matches }),
    );

    const canvas = within(canvasElement);
    // Below `lg` the sidebar is a different element (the drawer content replaces the div).
    const sidebar = await waitFor(async () => {
      const element = canvasElement.querySelector<HTMLElement>(`[data-testid="${SIDEBAR_TEST_ID}"]`);
      await expect(element?.getAttribute('role')).toBe('dialog');
      return element!;
    });
    await userEvent.click(canvas.getByRole('button', { name: 'Toggle navigation sidebar' }));
    await waitFor(() => expect(sidebar.getAttribute('data-state')).toBe('expanded'));
    await tick(400);

    const rect = sidebar.getBoundingClientRect();
    const paragraph = within(sidebar).getByText('Swipe toward the left edge to dismiss.');
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
  },
};
