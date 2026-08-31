//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef } from 'react';
import { expect } from 'storybook/test';

import { ListModel, Window, type WindowController } from '@dxos/react-ui-virtual';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { MarkdownBlock } from '../components';

/**
 * The inline axis against real content — editors, not boxes.
 *
 * `virtualizer/Horizontal` proves the arithmetic with rows that cannot lie about their size; this
 * is the acceptance the axis claim needs (SPEC F-1.7): a horizontal strip of real CodeMirror
 * documents, measured on the inline axis, where the *cross* axis (each card's height) is the hard
 * constraint of the layout and the extent is what varies. The axis is in scope for the
 * virtualizer only — the feed list stays vertical — so this story is the axis's whole acceptance
 * suite, and it deliberately reuses the invariants the block axis is held to.
 */
const CARDS = 200;

const documents = Array.from({ length: CARDS }, (_, index) => {
  const words = 3 + ((index * 7) % 24);
  return `### Card ${index}\n\n${Array.from({ length: words }, (_, word) => `word${word}`).join(' ')}`;
});

/** Declared widths, deliberately wrong for most cards so measurement is exercised. */
const extent = (index: number) => 240 + (index % 5) * 40;

const DefaultStory = () => {
  const controller = useRef<WindowController>(null);
  const extents = useMemo(() => ({ of: extent }), []);
  const model = useMemo(
    () =>
      new ListModel({
        items: Array.from({ length: CARDS }, (_, index) => ({ id: `card-${index}` })),
        getId: (item) => item.id,
      }),
    [],
  );

  return (
    <Window classNames='dx-grow' axis='inline' model={model} extents={extents} controllerRef={controller}>
      {(index) => (
        // Padding, never margin: a child's margin is outside its parent's offsetWidth, so the
        // measured extent would disagree with the rendered pitch by exactly the gap.
        <div className='h-full px-1 py-1'>
          <div className='h-full w-[20rem] border border-separator rounded-md p-2 overflow-hidden'>
            <MarkdownBlock text={documents[index]} />
          </div>
        </div>
      )}
    </Window>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-feed/stories/horizontal',
  render: DefaultStory,
  decorators: [withLayout({ layout: 'fullscreen' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof DefaultStory>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 30) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

/** The horizontal strip, passively. No play. */
export const Default: Story = {};

/**
 * The block-axis invariants, on the inline axis, with editors.
 *
 * Nothing here names a direction the arithmetic could hide behind: rows are tracked by index, a
 * scroll must move them by what was scrolled, and the far end must be reachable — the same three
 * readings `bridge/*` takes vertically.
 */
export const InlineContent: Story = {
  play: async ({ canvasElement }) => {
    await settle();
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const left = () => scroller.getBoundingClientRect().left;
    const read = () =>
      new Map(
        [...scroller.querySelectorAll<HTMLElement>('[data-index]')].map((row) => [
          Number(row.dataset.index),
          Math.round(row.getBoundingClientRect().left - left()),
        ]),
      );

    // A scroll moves the content by what was scrolled.
    const before = read();
    const from = scroller.scrollLeft;
    scroller.scrollLeft = from + 480;
    await settle(10);
    const scrolled = scroller.scrollLeft - from;
    const after = read();
    // A row's viewport position after the scroll is its old position minus the distance scrolled.
    const jumps = [...after]
      .filter(([index, position]) => before.has(index) && Math.abs(before.get(index)! - position - scrolled) > 2)
      .map(([index, position]) => ({ index, was: before.get(index)!, now: position, scrolled }));

    // And the end is reachable, which is what says the measured extents reached the sizer.
    let previous = -1;
    for (let attempt = 0; attempt < 8 && scroller.scrollLeft !== previous; attempt++) {
      previous = scroller.scrollLeft;
      scroller.scrollLeft = scroller.scrollWidth;
      await settle(10);
    }

    const last = scroller.querySelector<HTMLElement>(`[data-index="${CARDS - 1}"]`);
    const rests = !!last && Math.abs(last.getBoundingClientRect().right - scroller.getBoundingClientRect().right) <= 2;

    await expect({ mounted: after.size > 0, jumps, rests }).toEqual({ mounted: true, jumps: [], rests: true });
  },
};
