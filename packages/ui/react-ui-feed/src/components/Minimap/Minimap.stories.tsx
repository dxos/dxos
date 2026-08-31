//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { ListModel, Window, type WindowController, type WindowState } from '@dxos/react-ui-virtual';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Minimap } from './Minimap';

/**
 * The minimap against a live window, because its whole job is to draw what the window publishes:
 * the track is the document, the faint band the mounted rows, the solid band the viewport. Scroll
 * the list and the bands move; click the rail and the list jumps to that fraction.
 */
type StoryArgs = {
  count?: number;
  width?: number;
};

const EXTENT = (index: number) => 40 + (index % 8) * 30;

const DefaultStory = ({ count = 500, width }: StoryArgs) => {
  const model = useMemo(
    () =>
      new ListModel({
        items: Array.from({ length: count }, (_, index) => ({ id: `row-${index}` })),
        getId: (item) => item.id,
      }),
    [count],
  );
  const [state, setState] = useState<WindowState>();
  const controller = useRef<WindowController>(null);

  return (
    <div className='flex h-full gap-2 p-2'>
      <Window
        classNames='grow min-h-0'
        model={model}
        extents={{ of: EXTENT, exact: true }}
        onChange={setState}
        controllerRef={controller}
      >
        {(index) => (
          <div
            className='flex items-center justify-center border border-separator text-xs tabular-nums'
            style={{ height: EXTENT(index) }}
          >
            {index}
          </div>
        )}
      </Window>
      <Minimap
        state={state}
        width={width}
        onSelect={(fraction) => controller.current?.scrollToIndex(Math.round(fraction * (model.count - 1)))}
      />
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-feed/components/Minimap',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[40rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  args: { count: 500 },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** Scroll the list, watch the bands; click the rail, the list jumps. No play. */
export const Default: Story = {};

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 20) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

/**
 * The viewport band stays inside the mounted band — a viewport showing rows that are not mounted
 * would mean the reader is looking at nothing — and a click moves the list to that fraction.
 */
export const Tracks: Story = {
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const rail = canvasElement.querySelector<HTMLElement>('[data-testid="minimap"]')!;
    const band = (testid: string) => {
      const element = rail.querySelector<HTMLElement>(`[data-testid="${testid}"]`)!;
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    };

    const inside = () => {
      const mounted = band('minimap.mounted');
      const viewport = band('minimap.viewport');
      return viewport.top >= mounted.top - 1 && viewport.bottom <= mounted.bottom + 1;
    };

    // At rest, mid-scroll, and settled again.
    const readings = [inside()];
    scroller.scrollTop = 20_000;
    await settle(5);
    readings.push(inside());
    await settle(20);
    readings.push(inside());

    // A click near the middle of the rail lands the list near the middle of the document.
    const box = rail.getBoundingClientRect();
    rail.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: box.left + 4, clientY: box.top + box.height / 2 }),
    );
    await settle();
    const total = scroller.scrollHeight - scroller.clientHeight;
    const nearMiddle = Math.abs(scroller.scrollTop / total - 0.5) < 0.1;

    await expect({ readings, nearMiddle }).toEqual({ readings: [true, true, true], nearMiddle: true });
  },
};
