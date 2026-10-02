//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';

type StoryArgs = Pick<Next.MainRootProps, 'defaultNavigationSidebarState' | 'defaultComplementarySidebarState'> & {
  defaultDrawerState?: Next.MainDrawerState;
};

const NavigationToggle = () => {
  const { toggleNavigationSidebar } = Next.useMainSidebars('Story.NavigationToggle');
  return (
    <Next.Button
      icon='ph--sidebar-simple--regular'
      iconOnly
      label='Toggle navigation'
      onClick={toggleNavigationSidebar}
    />
  );
};

const ComplementaryToggle = () => {
  const { toggleComplementarySidebar } = Next.useMainSidebars('Story.ComplementaryToggle');
  return (
    <Next.Button
      icon='ph--sidebar-simple--regular'
      iconOnly
      label='Toggle complementary'
      onClick={toggleComplementarySidebar}
    />
  );
};

/** Buttons inside a landmark, so Enter has somewhere to move focus and the area reads like a populated sidebar. */
const AreaItems = ({ label }: { label: string }) => (
  <>
    {['One', 'Two', 'Three'].map((item) => (
      <Next.Button key={item} variant='ghost' align='start'>{`${label} ${item}`}</Next.Button>
    ))}
  </>
);

const DefaultStory = ({
  defaultNavigationSidebarState = 'closed',
  defaultComplementarySidebarState = 'closed',
  defaultDrawerState = 'closed',
}: StoryArgs) => {
  const [drawerState, setDrawerState] = useState<Next.MainDrawerState>(defaultDrawerState);
  return (
    <Next.Main.Root
      defaultNavigationSidebarState={defaultNavigationSidebarState}
      defaultComplementarySidebarState={defaultComplementarySidebarState}
      drawerState={drawerState}
      onDrawerStateChange={setDrawerState}
    >
      <Next.Main.Overlay />
      <Next.Main.NavigationSidebar label='Navigation'>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Navigation</Next.Toolbar.Text>
        </Next.Toolbar.Root>
        <AreaItems label='Navigation' />
      </Next.Main.NavigationSidebar>
      <Next.Main.Content handlesFocus data-testid='content'>
        <Next.Toolbar.Root>
          <NavigationToggle />
          <Next.Toolbar.Text>Main</Next.Toolbar.Text>
          <Next.Button onClick={() => setDrawerState(drawerState === 'open' ? 'closed' : 'open')}>Drawer</Next.Button>
          <ComplementaryToggle />
        </Next.Toolbar.Root>
        <AreaItems label='Main' />
        <div className='h-[150dvh] p-4'>Tall content</div>
      </Next.Main.Content>
      <Next.Main.Drawer label='Drawer'>
        <Next.Typography>Drawer content</Next.Typography>
      </Next.Main.Drawer>
      <Next.Main.ComplementarySidebar label='Complementary'>
        <Next.Toolbar.Root>
          <Next.Toolbar.Text>Complementary</Next.Toolbar.Text>
        </Next.Toolbar.Root>
        <AreaItems label='Complementary' />
      </Next.Main.ComplementarySidebar>
    </Next.Main.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Main',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  args: { defaultNavigationSidebarState: 'expanded', defaultComplementarySidebarState: 'expanded' },
  argTypes: {
    defaultNavigationSidebarState: { control: 'inline-radio', options: ['closed', 'collapsed', 'expanded'] },
    defaultComplementarySidebarState: { control: 'inline-radio', options: ['closed', 'collapsed', 'expanded'] },
  },
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const sidebar = (canvasElement: HTMLElement, side: 'start' | 'end') => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-scope="main"][data-side="${side}"]`);
  if (!element) {
    throw new Error(`No ${side} sidebar`);
  }
  return element;
};

/** The toggles drive the sidebar states; a closed sidebar is inert and off screen, an open one a labelled landmark. */
export const Test: Story = {
  args: { defaultNavigationSidebarState: 'closed', defaultComplementarySidebarState: 'closed' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const start = sidebar(canvasElement, 'start');
    await expect(start).toHaveAttribute('data-state', 'closed');
    await expect(start).toHaveAttribute('inert');
    await expect(start.getBoundingClientRect().right).toBeLessThanOrEqual(0);

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle navigation' }));
    await waitFor(() => expect(start).toHaveAttribute('data-state', 'expanded'));
    await expect(start).not.toHaveAttribute('inert');
    await expect(start).toHaveAccessibleName('Navigation');
    await waitFor(() => expect(start.getBoundingClientRect().left).toBeGreaterThanOrEqual(0));
    await expect(start.getBoundingClientRect().width).toBeGreaterThan(0);

    await userEvent.click(canvas.getByRole('button', { name: 'Toggle complementary' }));
    const end = sidebar(canvasElement, 'end');
    await waitFor(() => expect(end).toHaveAttribute('data-state', 'expanded'));
    await waitFor(() => expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth + 0.5));
  },
};

/** Open, the drawer is a region the content pads block-end for; closed, it leaves the DOM and the padding. */
export const Drawer: Story = {
  args: { defaultDrawerState: 'open' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole('region', { name: 'Drawer' });
    const content = canvas.getByTestId('content');
    const height = region.getBoundingClientRect().height;
    await expect(height).toBeCloseTo(Next.MAIN_DRAWER_DEFAULT_HEIGHT * 16, 0);
    await expect(parseFloat(getComputedStyle(content).paddingBlockEnd)).toBeCloseTo(height, 0);

    // The resize handle is a separator that steps a rem per arrow key.
    const handle = within(region).getByRole('separator', { name: 'Resize drawer' });
    handle.focus();
    await userEvent.keyboard('{ArrowUp}');
    await waitFor(() => expect(region.getBoundingClientRect().height).toBeCloseTo(height + 16, 0));

    await userEvent.click(canvas.getByRole('button', { name: 'Drawer' }));
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Drawer' })).toBeNull());
    await waitFor(() => expect(parseFloat(getComputedStyle(content).paddingBlockEnd)).toBe(0));
  },
};

/**
 * The sidebars and the main area are focus areas: Tab moves between them, and the focused one draws an inset ring that
 * paints over its children, so a toolbar's background cannot hide it; the main area's spans only its visible part.
 */
export const FocusAreas: Story = {
  play: async ({ canvasElement }) => {
    const areas = [
      sidebar(canvasElement, 'start'),
      within(canvasElement).getByTestId('content'),
      sidebar(canvasElement, 'end'),
    ];
    const reached = new Set<HTMLElement>();
    for (let step = 0; step < 30 && reached.size < areas.length; step++) {
      await userEvent.tab();
      const area = areas.find((candidate) => candidate === document.activeElement);
      if (area) {
        reached.add(area);
        if (area === areas[1]) {
          // The content's ring is a fixed overlay over the visible area between the sidebars.
          const ring = getComputedStyle(area, '::after');
          await expect(ring.boxShadow).not.toBe('none');
          await expect(parseFloat(ring.left)).toBeCloseTo(areas[0].getBoundingClientRect().right, 0);
          await expect(parseFloat(ring.right)).toBeCloseTo(
            window.innerWidth - areas[2].getBoundingClientRect().left,
            0,
          );
        } else {
          const style = getComputedStyle(area);
          await expect(style.outlineStyle).toBe('solid');
          await expect(parseFloat(style.outlineOffset)).toBeLessThan(0);
        }
      }
    }
    await expect(reached.size).toBe(areas.length);

    // On a focused area, ArrowRight and ArrowLeft move between areas as Tab and Shift+Tab do.
    areas[0].focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(areas[1]).toHaveFocus());
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() => expect(areas[0]).toHaveFocus());
  },
};
