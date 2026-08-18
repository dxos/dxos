//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

/**
 * The deciding case: a model answering into the tail while the reader watches.
 *
 * Every other rung measures a feed that has stopped. This one measures the feed doing the thing it
 * exists for — a row growing on every frame, re-parsing its markdown as it goes, while the list
 * follows the tail it keeps moving. Streaming is where the follow, the measurement and the item's
 * reconciliation all run at once, and it is the only place their interaction shows.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/baseline/streaming',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  // Seeded with history on purpose: a feed that does not fill its viewport has nothing to follow,
  // so a test of the follow over an empty one passes whatever the follow does.
  args: { scenario: 'assistant', count: 200, streaming: true, debug: false, scrollPastEnd: false },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

/** Three seconds: several chunks, and at least one gap between turns for the follow to land in. */
const WATCH_FRAMES = 240;

/** How far the tail may sit below the fold and still count as landed. */
const TOLERANCE = 2;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

type Sample = {
  /** The furthest-on row mounted, and how far its bottom is below the viewport's. */
  behind: number;
  /** The document's height, which a turn can *reduce* — see below. */
  height: number;
  /** Viewport-relative top of every mounted row, by index. */
  tops: Map<number, number>;
};

/**
 * Read from the last row mounted rather than a fixed index: the feed is growing, so the identity of
 * the last message changes while the sample runs.
 */
const sample = (viewport: HTMLElement): Sample | null => {
  const rows = [...viewport.querySelectorAll<HTMLElement>('[data-index]')];
  if (!rows.length) {
    return null;
  }

  const box = viewport.getBoundingClientRect();
  const last = rows.reduce((furthest, row) =>
    Number(row.dataset.index) > Number(furthest.dataset.index) ? row : furthest,
  );

  return {
    behind: Math.round(last.getBoundingClientRect().bottom - box.bottom),
    height: viewport.scrollHeight,
    tops: new Map(
      rows.map((row) => [Number(row.dataset.index), Math.round(row.getBoundingClientRect().top - box.top)]),
    ),
  };
};

/**
 * Rows that moved *down* between two frames, on a frame where the document did not shrink.
 *
 * Direction is the whole point. Content arriving at the tail pushes everything above it up, so rows
 * moving up is the feed working, and a row moving down is the list undoing something — a measurement
 * correction, or two things compensating for one change — which reads as a jump mid-answer.
 *
 * The exception is real and is not a defect: a turn *removes* blocks as well as adding them — the
 * status goes when the answer starts — and a feed pinned to its tail keeps the tail pinned by moving
 * everything down. Measured here as thirteen rows moving together by exactly 65px, landing the tail
 * at zero. Counting that would be counting the feed doing its job.
 */
const descended = (a: Sample, b: Sample): number =>
  b.height < a.height
    ? 0
    : [...b.tops].filter(([index, top]) => a.tops.has(index) && top - a.tops.get(index)! > 1).length;

/** Passive: press ▶ yourself. */
export const Default: Story = {};

export const Streaming: Story = {
  play: async ({ canvasElement }) => {
    const viewport = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!;
    const samples: Sample[] = [];
    for (let frame = 0; frame < WATCH_FRAMES; frame++) {
      await nextFrame();
      const current = sample(viewport);
      if (current) {
        samples.push(current);
      }
    }

    const backwards = samples.reduce(
      (total, current, index) => total + (index ? descended(samples[index - 1], current) : 0),
      0,
    );

    // The follow is allowed to lag — it accelerates into a travel rather than teleporting — but it
    // has to be closing the gap, not opening one: a tail further away at the end than it ever was in
    // the middle is a follow that has given up.
    const worst = Math.max(...samples.map(({ behind }) => behind));
    const landed = samples.at(-1)!.behind;

    await expect({ backwards, landedWithin: landed <= TOLERANCE || landed < worst }).toEqual({
      backwards: 0,
      landedWithin: true,
    });
  },
};
