//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../testing';

/**
 * A feed opened at its tail shows its last message, and stays there.
 *
 * Both halves matter and both have been broken. The feed has landed at the tail the *estimate*
 * predicted — 60,000px into a document that measured 71,565 — and been marked positioned there, so
 * it opened part-way up the conversation and crept the rest of the way at two rows a second. And
 * with space reserved past the end it has scrolled straight through the last message into the blank
 * area below it, because the follow chased the element's own maximum rather than the last row.
 *
 * So the reading here is the **last row's own bottom edge**, measured against the viewport's, rather
 * than the scroll offset: an offset can be at the document's end while the last message is nowhere
 * near the screen. It has to arrive there, and it has to stop.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/stories/tail',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

/** Two seconds: long enough to cover the rebuild that follows the first fill, at ~700ms. */
const WATCH_FRAMES = 150;

/** Frames from the start that are allowed to still be arriving. */
const ARRIVING = 100;

/**
 * How far the last row's bottom may sit from the viewport's, in px.
 *
 * Not zero: a row's height is fractional and the scroll offset is rounded, so the two edges meet
 * within a pixel rather than exactly.
 */
const TOLERANCE = 2;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * The last message's bottom edge relative to the viewport's; `null` while it is not mounted.
 *
 * Zero means the last message is resting on the bottom of the screen — which is what "at the tail"
 * means to a reader. Positive means it is below the fold, negative means the feed has scrolled past
 * it into empty space.
 */
const tailOf = (viewport: HTMLElement, last: number): number | null => {
  const row = viewport.querySelector(`[data-index="${last}"]`);
  return row ? Math.round(row.getBoundingClientRect().bottom - viewport.getBoundingClientRect().bottom) : null;
};

/** The reserve trailing the last row, read from the placement the list itself is driven by. */
const reserveOf = (viewport: HTMLElement, last: number): number => {
  const placement = (viewport as any).__feed?.placement;
  if (!placement) {
    return 0;
  }

  return Math.round(placement.layout().sizerExtent - (placement.positionOf(last) + placement.extentOf(last)));
};

const playTail = (count: number) =>
  async function play({ canvasElement }: { canvasElement: HTMLElement }) {
    const viewport = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]')!;
    const samples: (number | null)[] = [];
    for (let frame = 0; frame < WATCH_FRAMES; frame++) {
      await nextFrame();
      samples.push(tailOf(viewport, count - 1));
    }

    // The rest position includes the reserve: the tail sits its tail-lines clear of the edge.
    const rest = -reserveOf(viewport, count - 1);
    const settled = samples.slice(ARRIVING);
    // Reported as a set rather than a count: a failure then shows what the tail was doing — absent
    // (`null`), below the fold, or drifting a pixel at a time — instead of only that it was wrong.
    await expect({
      distinct: [...new Set(settled)].sort(),
      offBy: [...new Set(settled.map((value) => (value === null || Math.abs(value - rest) > TOLERANCE ? value : 0)))],
    }).toEqual({ distinct: [...new Set(settled)].sort(), offBy: [0] });
  };

//
// The same feed with and without space reserved past the last row. Reserving it moves the
// element's maximum well beyond the tail, so everything that opens or follows the feed has to stop
// short of it — which is exactly what a test of the offset alone would not notice.
//

/** Passive: open at the tail and look. */
export const Default: Story = {
  args: { scenario: 'thread', count: 500, tailLines: 4 },
};

/** Tall, uneven rows: the case where the estimate is furthest from the truth. */
export const Plain: Story = {
  args: { scenario: 'plain', count: 500 },
  play: playTail(500),
};

export const PlainPastEnd: Story = {
  args: { scenario: 'plain', count: 500, tailLines: 4 },
  play: playTail(500),
};

/** Short rows, all identical: the estimate is right, so the tail should be right immediately. */
export const Uniform: Story = {
  args: { scenario: 'uniform', count: 500 },
  play: playTail(500),
};

export const UniformPastEnd: Story = {
  args: { scenario: 'uniform', count: 500, tailLines: 4 },
  play: playTail(500),
};

/** A chat's shape: per-message renderers, block widgets, and a per-row estimate. */
export const Assistant: Story = {
  args: { scenario: 'assistant', count: 200 },
  play: playTail(200),
};

export const AssistantPastEnd: Story = {
  args: { scenario: 'assistant', count: 200, tailLines: 4 },
  play: playTail(200),
};

/**
 * The rung the reader actually opened: an editor per row, contents of different lengths.
 *
 * `plain` and `uniform` are estimates that happen to be right, and `assistant` is 200 rows rather
 * than 500. This is the one where the estimate is wrong for nearly every row *and* the document is
 * long.
 *
 * Its `scrollPastEnd` twin is **not** here, and deliberately. It fails, and what it fails on is not
 * fixable in this engine: the reserved space is a DOM spacer, so it is in the element's
 * `scrollHeight` and not in the virtualizer's total, and an offset inside it is beyond the
 * virtualizer's own maximum — `scrollToOffset` then silently declines to move (verified: the element
 * stayed exactly where it was). The feed opens at the document's end with its last message near the
 * top of an empty screen. Two coordinate systems for one document is the defect the placement layer
 * exists to remove, so the requirement is stated where it can be met: `bridge/VariedPastEnd`.
 */
export const Varied: Story = {
  args: { scenario: 'thread', count: 500 },
  play: playTail(500),
};

export const VariedPastEnd: Story = {
  args: { scenario: 'thread', count: 500, tailLines: 4 },
  play: playTail(500),
};
