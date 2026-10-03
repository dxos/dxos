//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../testing/index.ts';

/**
 * The deciding case: a model answering into the tail while the reader watches.
 *
 * Every other rung measures a feed that has stopped. This one measures the feed doing the thing it
 * exists for — a row growing on every frame, re-parsing its markdown as it goes, while the list
 * follows the tail it keeps moving. Streaming is where the follow, the measurement and the item's
 * reconciliation all run at once, and it is the only place their interaction shows.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/stories/streaming',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
  // Seeded with history on purpose: a feed that does not fill its viewport has nothing to follow,
  // so a test of the follow over an empty one passes whatever the follow does.
  args: { scenario: 'assistant', count: 200, streaming: true, debug: false, tailLines: 0 },
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
  /**
   * Content-space top of every mounted row: viewport-relative top plus the scroll offset.
   *
   * Viewport space cannot be the reading, because the follow *writes the scroll* — every mounted
   * row then moves on screen while nothing about the layout is wrong, and a shrink-and-regrow turn
   * torn across two samples reads as thirteen rows jumping. In content space the follow's writes
   * are invisible, a shrinking turn moves later rows up, and nothing has any business moving down.
   */
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
    tops: new Map(
      rows.map((row) => [
        Number(row.dataset.index),
        Math.round(row.getBoundingClientRect().top - box.top + viewport.scrollTop),
      ]),
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
/** Rows that moved down in content space — which nothing in a streaming feed may do. */
const descended = (a: Sample, b: Sample): number =>
  [...b.tops].filter(([index, top]) => a.tops.has(index) && top - a.tops.get(index)! > 1).length;

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
    // has to land: polled past the watch, because a slow runner stretches every frame while the
    // stream's timers run on the wall clock, and sampling mid-turn measures the runner.
    let landed = samples.at(-1)!.behind;
    for (let frame = 0; frame < 600 && landed > TOLERANCE; frame++) {
      await nextFrame();
      landed = sample(viewport)?.behind ?? landed;
    }

    await expect({ backwards, landed: landed <= TOLERANCE }).toEqual({
      backwards: 0,
      landed: true,
    });
  },
};
