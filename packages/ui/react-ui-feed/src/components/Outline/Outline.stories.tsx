//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Outline, type OutlineMarker, type OutlineProps } from './Outline.tsx';

const DOC_LENGTH = 2000;
const WINDOW = 320;

// Synthetic prompt/response markers spread across a document of length `DOC_LENGTH`.
const createMarkers = (count: number): OutlineMarker[] =>
  Array.from({ length: count }, (_, index) => {
    const from = Math.round((index / count) * DOC_LENGTH);
    const to = Math.round(((index + 1) / count) * DOC_LENGTH) - 8;
    return {
      id: `marker-${index}`,
      title: `Prompt ${index + 1}`,
      description: `Response snippet for prompt ${index + 1}. This is the first few lines of the assistant reply, shown in the popover on hover.`,
      range: { from, to },
    };
  });

const defaultMarkers = createMarkers(14);

const DefaultStory = ({ markers, ...props }: OutlineProps) => {
  const [start, setStart] = useState(0);
  const [selected, setSelected] = useState<OutlineMarker | null>(null);
  const visibleRange = useMemo(() => ({ from: start, to: start + WINDOW }), [start]);

  return (
    <div className='relative grid grid-cols-[3rem_1fr] gap-6 p-4'>
      <div>
        <div className='absolute left-4 top-4'>
          <Outline
            {...props}
            markers={markers}
            visibleRange={visibleRange}
            // The wiring a host actually uses: arrows step the *document*, not the rail's ticks,
            // because the rail thins its markers and the two are not one-to-one.
            onNavigate={(delta) =>
              setStart((current) => Math.max(0, Math.min(current + delta * (DOC_LENGTH / 14), DOC_LENGTH - WINDOW)))
            }
            onSelect={(marker) => {
              setSelected(marker);
              // Clicking a tick moves the visible range to that marker.
              setStart(Math.max(0, Math.min(marker.range.from, DOC_LENGTH - WINDOW)));
            }}
          />
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <label className='flex flex-col gap-1 text-sm'>
          <span className='text-description'>
            Visible range: {visibleRange.from}–{visibleRange.to} (drag to scroll)
          </span>
          <input
            type='range'
            min={0}
            max={DOC_LENGTH - WINDOW}
            value={start}
            onChange={(event) => setStart(Number(event.target.value))}
          />
        </label>
        <p className='text-sm text-description'>
          Hover the rail to see the wave + popover. Ticks intersecting the visible range are brighter.
        </p>
        <p className='text-sm'>Selected: {selected ? selected.title : '(none)'}</p>
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-feed/components/Outline',
  component: Outline,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof Outline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    markers: defaultMarkers,
  },
};

export const Empty: Story = {
  args: {
    markers: [],
  },
};

/**
 * A click does not leave a position asserted behind it.
 *
 * Clicking a tick focuses it, and the card was gated on focus — so the reader clicked, moved away,
 * and a keyboard position they never asked for kept it up. What may assert a position is the pointer
 * being over a tick, or the keyboard having *navigated* to one; focus is neither, and a click
 * confers focus as a side effect.
 *
 * What this does **not** cover is the pointer actually leaving, because React synthesises enter and
 * leave from over/out pairs and three attempts to drive that from dispatched events did not reach
 * the handler — the state was still set afterwards whether or not the component was right. Asserting
 * it here would be asserting the probe. It needs a real pointer; see `chat-ui/TASKS.md`.
 */
export const Dismissal: Story = {
  args: { markers: defaultMarkers },
  play: async ({ canvasElement }) => {
    const rail = canvasElement.querySelector<HTMLElement>('[role="navigation"]')!;
    const tick = rail.querySelectorAll('button')[3] as HTMLElement;
    const settle = async () => {
      for (let frame = 0; frame < 20; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };

    // Focused explicitly as well as clicked: a dispatched `click()` does not move focus, and focus
    // is the thing whose side effect this is about.
    tick.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tick.focus();
    tick.click();
    await settle();

    await expect({
      focused: canvasElement.ownerDocument.activeElement === tick,
      navigated: rail.dataset.navigated,
    }).toEqual({ focused: true, navigated: '' });
  },
};

/**
 * The arrows take the card over from the pointer, and pointing takes it back.
 *
 * A reader clicks a tick and then presses an arrow without moving the mouse — which is the whole
 * point of clicking one. The pointer is still resting on the tick they clicked, so a rule of
 * "the pointer always wins" pins the card to a place they have already left, and the feed scrolls
 * under a card describing somewhere else. Reported from a real session as "card does not move".
 */
export const KeyboardTakeover: Story = {
  args: { markers: defaultMarkers },
  play: async ({ canvasElement }) => {
    const rail = canvasElement.querySelector<HTMLElement>('[role="navigation"]')!;
    const tick = rail.querySelectorAll('button')[3] as HTMLElement;
    // Polled to the condition rather than settled by frame count: the transitions run through
    // effects whose commit timing differs between a laptop and CI, and a fixed wait encodes
    // whichever machine wrote it.
    const until = async (condition: () => boolean, frames = 300) => {
      for (let frame = 0; frame < frames && !condition(); frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
      return condition();
    };

    // `pointerover`, not `pointerenter`: React synthesises enter from over/out pairs, so over is the
    // event a handler actually hears.
    tick.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    const hovered = await until(() => rail.dataset.pointer === '3' && rail.dataset.shown === '3');

    tick.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    tick.focus();
    tick.click();

    // Three presses, with the pointer never moving off the tick that was clicked; the card must
    // move with the keyboard even though the pointer has not moved at all.
    let moved = false;
    for (let press = 0; press < 3; press++) {
      tick.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      moved = (await until(() => rail.dataset.shown !== '3', 60)) || moved;
    }

    // Deliberately NOT asserted: that `data-pointer` still reads '3'. Chrome re-hit-tests a
    // stationary cursor when layout shifts under it and fires real pointerover at wherever the
    // runner last left the mouse — so on CI the backstop clears the pointer through no fault of the
    // component's. What the product owes the reader is that the card moved with the keyboard and
    // that pointing again takes over, and both are asserted.

    // Pointing again hands it back: the pointer is the more direct statement while it is being made.
    tick.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    const returned = await until(() => rail.dataset.shown === rail.dataset.pointer && rail.dataset.pointer === '3');

    await expect({ hovered, moved, returned }).toEqual({
      hovered: true,
      moved: true,
      returned: true,
    });
  },
};
