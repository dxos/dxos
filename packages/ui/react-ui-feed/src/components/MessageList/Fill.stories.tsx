//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { FeedStory, type FeedStoryProps } from '../../testing';

/**
 * How long the first fill takes, and what it spends the time on.
 *
 * `baseline/Uniform` visibly fills from the bottom up over more than a second, which construction
 * cost does not explain — `baseline/construction` measures one item at ~0.4ms, so a viewport of them
 * is ~8ms. The remaining explanation is the number of *passes*: every measured row changes the
 * offsets below it, and each correction the virtualizer makes costs a frame. This samples the DOM
 * once per animation frame and reports how many frames the list took to stop changing.
 */
const meta: Meta<FeedStoryProps> = {
  title: 'ui/react-ui-feed/baseline/fill',
  render: FeedStory,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<FeedStoryProps>;

type Sample = {
  /** Milliseconds since the play function started sampling. */
  at: number;
  /** Rows the virtualizer has mounted. */
  rows: number;
  scrollTop: number;
  scrollHeight: number;
  /** Viewport-relative top of the first mounted row: the reader's evidence that the list moved. */
  firstTop: number;
};

/**
 * Sampled for a fixed window rather than until it holds still.
 *
 * Stopping at the first quiet patch reports the fill and hides everything after it: the layout can
 * be rebuilt from the top hundreds of milliseconds later — after the quiet period that gates the
 * re-base — and a reader sees the whole page move. Two seconds covers that.
 */
const WATCH_FRAMES = 150;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * Samples the scroll container once per frame until it stops changing.
 *
 * Read in the same frame as the scroll, deliberately: a row's position and the scroll offset taken
 * from different frames differ by whatever happened between them, which reads as movement.
 */
const sampleFill = async (viewport: HTMLElement): Promise<Sample[]> => {
  const samples: Sample[] = [];
  const start = performance.now();

  for (let frame = 0; frame < WATCH_FRAMES; frame++) {
    await nextFrame();
    const rows = viewport.querySelectorAll('[data-index]');
    const first = rows[0]?.getBoundingClientRect().top ?? 0;
    const sample: Sample = {
      at: Math.round(performance.now() - start),
      rows: rows.length,
      scrollTop: Math.round(viewport.scrollTop),
      scrollHeight: Math.round(viewport.scrollHeight),
      firstTop: Math.round(first - viewport.getBoundingClientRect().top),
    };

    samples.push(sample);
  }

  return samples;
};

const unchanged = (a: Sample, b: Sample) =>
  a.rows === b.rows && a.scrollTop === b.scrollTop && a.scrollHeight === b.scrollHeight && a.firstTop === b.firstTop;

/** Only the frames where something moved: a run of identical frames says nothing. */
const changes = (samples: Sample[]) =>
  samples.filter((sample, index) => index === 0 || !unchanged(samples[index - 1], sample));

const report = (name: string, samples: Sample[]) => {
  const moved = changes(samples);
  const settled = samples.indexOf(moved.at(-1)!) + 1;
  const header = ['at ms', 'rows', 'scrollTop', 'scrollHeight', 'firstTop'];
  const body = moved.map(({ at, rows, scrollTop, scrollHeight, firstTop }) =>
    [at, rows, scrollTop, scrollHeight, firstTop].map(String),
  );
  const widths = header.map((_, column) => Math.max(...[header, ...body].map((row) => row[column].length)));
  const table = [header, ...body]
    .map((row) => row.map((cell, column) => cell.padStart(widths[column])).join('  '))
    .join('\n');

  // eslint-disable-next-line no-console
  console.log(
    `[fill: ${name}] last change at frame ${settled} (${samples[settled - 1]?.at ?? 0}ms), ` +
      `${moved.length} of ${samples.length} frames changed something\n${table}`,
  );
};

/**
 * Main-thread time the mount cost, which the frame sampler cannot see.
 *
 * A play function does not start until the story has rendered, so everything expensive has already
 * happened by the time it can look. The observer is installed when this module is evaluated —
 * before any story renders — and simply keeps the long tasks it is handed.
 */
const longTasks: PerformanceEntry[] = [];
if (typeof PerformanceObserver !== 'undefined' && PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
  new PerformanceObserver((list) => longTasks.push(...list.getEntries())).observe({ entryTypes: ['longtask'] });
}

const playFill = (name: string, allowed = 0) =>
  async function play({ canvasElement }: { canvasElement: HTMLElement }) {
    const viewport = await waitForViewport(canvasElement);
    const samples = await sampleFill(viewport);
    report(name, samples);
    // Entries arrive through the observer's callback, so one more turn is needed before the last
    // task of the fill is in the buffer.
    await nextFrame();
    const blocking = longTasks.splice(0).map(({ duration }) => Math.round(duration));
    // eslint-disable-next-line no-console
    console.log(
      `[fill: ${name}] blocking ${blocking.reduce((sum, ms) => sum + ms, 0)}ms in ${blocking.length} long tasks ` +
        `[${blocking.join(', ')}]`,
    );
    // The invariant is not that the document never changes — the layout is rebuilt when the measured
    // average leaves the estimate behind, and that is correct. It is that a rebuild does not move
    // what the reader is looking at: the document's height and the scroll offset have to change in
    // the same frame, so the rows stay where they are. Anything else is the whole page jumping half
    // a second after it settled.
    const moved = samples.filter(
      (sample, index) =>
        index > 0 &&
        sample.scrollHeight !== samples[index - 1].scrollHeight &&
        sample.firstTop !== samples[index - 1].firstTop,
    );
    await expect({ name, jumped: moved.length }).toEqual({ name, jumped: allowed });
  };

const waitForViewport = async (canvasElement: HTMLElement): Promise<HTMLElement> => {
  for (let frame = 0; frame < 120; frame++) {
    const viewport = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]');
    if (viewport?.querySelector('[data-index]')) {
      return viewport;
    }
    await nextFrame();
  }

  throw new Error('feed viewport never mounted a row');
};

/** No editor at all: the floor, and what every other case is compared against. */
export const Plain: Story = {
  args: { scenario: 'plain', count: 500 },
  play: playFill('plain 500'),
};

/**
 * The same feed, a tenth the length.
 *
 * A virtualized list mounts a viewport's worth of rows either way, so a cost that follows the count
 * belongs to the model — building the messages, projecting them — and a cost that does not belongs
 * to the rows on screen. Which one it is decides where the fix goes.
 */
export const PlainShort: Story = {
  args: { scenario: 'plain', count: 50 },
  play: playFill('plain 50'),
};

/** One editor per row, all identical — construction, and nothing else, added to `Plain`. */
export const Uniform: Story = {
  args: { scenario: 'uniform', count: 500 },
  play: playFill('uniform 500'),
};

export const UniformShort: Story = {
  args: { scenario: 'uniform', count: 50 },
  play: playFill('uniform 50'),
};

/**
 * Contents of different lengths, so the estimate is wrong for most rows.
 *
 * The one rung where the rebuild is still not atomic: the reader is put back by index, and with rows
 * of every height the offsets around the landing point are mostly estimates, so the virtualizer
 * retries across a frame and the page is seen to move in it. Restoring by offset instead lands in
 * one frame and then spends a second correcting itself — measured at 69–96 of 150 frames changing,
 * against one here. Recorded in `chat-ui/TASKS.md`; the allowance is what is measured today, so a
 * regression past it still fails.
 */
export const Varied: Story = {
  args: { count: 500 },
  play: playFill('varied 500', 1),
};
