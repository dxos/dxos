//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';

import { withTheme } from '@dxos/react-ui/testing';

import { NavigationStack, type NavigationStackProps } from './NavigationStack';

const ITEMS = ['root', 'settings', 'general'];

const StackHarness = (props: Partial<NavigationStackProps>) => {
  const [index, setIndex] = useState(ITEMS.length - 1);
  const handleIndexChange = useCallback((next: number) => setIndex(next), []);

  return (
    <div className='w-[375px] h-[600px]' data-testid='stack-host'>
      <NavigationStack
        classNames='size-full'
        items={ITEMS}
        index={index}
        onIndexChange={handleIndexChange}
        renderItem={(id) => (
          <div className='dx-base-surface size-full p-4' data-testid={`panel-${id}`}>
            {id}
          </div>
        )}
        {...props}
      />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-mobile/components/NavigationStack',
  component: StackHarness,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof StackHarness>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const pointer = (type: string, clientX: number) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX,
    clientY: 300,
  });

const topPanel = (canvas: HTMLElement) => {
  const panels = canvas.querySelectorAll<HTMLElement>('[data-object-id]');
  return panels[panels.length - 1];
};

/**
 * Real elapsed time between the drag and the release, so the cached velocity ages past
 * `VELOCITY_MAX_AGE_MS` and the release reads as a short drag rather than a flick — the flick path
 * completes the pop and would mask whether an unseen release settles.
 */
const pause = () => new Promise((resolve) => setTimeout(resolve, 150));

/**
 * An edge-swipe whose release never reaches the stack must still settle. WebKit hands `pointerup` to
 * the original hit-test target once it drops an implicit pointer capture, so a stack that only
 * listened on its own root was left holding the last dragged pose — a permanent sliver of the parked
 * panel at the leading edge.
 */
export const ReleaseOutsideStack: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = await canvas.findByTestId('stack-host');
    const stack = host.firstElementChild as HTMLElement;
    const bounds = stack.getBoundingClientRect();

    stack.dispatchEvent(pointer('pointerdown', bounds.left + 5));
    stack.dispatchEvent(pointer('pointermove', bounds.left + 40));
    await expect(topPanel(canvasElement).getBoundingClientRect().left).toBeGreaterThan(bounds.left);
    await pause();

    // Deliberately dispatched away from the stack: this is the release the old code never saw.
    document.body.dispatchEvent(pointer('pointerup', bounds.left + 40));

    await waitFor(() => expect(topPanel(canvasElement).getBoundingClientRect().left).toBeCloseTo(bounds.left, 0));
    await expect(canvas.getByTestId('panel-general')).toBeInTheDocument();
  },
};

/**
 * The stack root must clip, never scroll. `overflow: hidden` is a scroll container and a panel parked
 * off-screen right makes it scrollable, so a `scrollIntoView` from inside a freshly pushed panel
 * carries the whole stack sideways — Chromium clamps it back as the panel lands, WebKit leaves it
 * there and the panel is off-screen and untappable for good.
 */
export const RootDoesNotScroll: Story = {
  args: { index: 0 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = await canvas.findByTestId('stack-host');
    const stack = host.firstElementChild as HTMLElement;

    // Panels ahead of the top rest at 100%, so a scroll container would have somewhere to scroll to.
    stack.scrollLeft = 200;
    await expect(stack.scrollLeft).toBe(0);

    const panels = canvasElement.querySelectorAll<HTMLElement>('[data-object-id]');
    await expect(panels[0].getBoundingClientRect().left).toBeCloseTo(stack.getBoundingClientRect().left, 0);
  },
};

/**
 * A cancelled gesture snaps back rather than completing a pop the platform took away — and the cancel
 * counts wherever it lands. The platform taking the touch over is the very thing that drops the
 * implicit capture, so the cancel is delivered off the stack for the same reason the release is; a
 * cancel dispatched on the stack root would only re-test the path that already worked.
 */
export const CancelledGesture: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = await canvas.findByTestId('stack-host');
    const stack = host.firstElementChild as HTMLElement;
    const bounds = stack.getBoundingClientRect();

    stack.dispatchEvent(pointer('pointerdown', bounds.left + 5));
    stack.dispatchEvent(pointer('pointermove', bounds.left + 40));
    await expect(topPanel(canvasElement).getBoundingClientRect().left).toBeGreaterThan(bounds.left);
    await pause();
    document.body.dispatchEvent(pointer('pointercancel', bounds.left + 40));

    await waitFor(() => expect(topPanel(canvasElement).getBoundingClientRect().left).toBeCloseTo(bounds.left, 0));
    await expect(canvas.getByTestId('panel-general')).toBeInTheDocument();
  },
};
