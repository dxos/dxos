//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { Fragment, useEffect, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '../../testing/index.ts';
import { Tooltip } from '../Tooltip/index.ts';
import { Timestamp } from './Timestamp.tsx';

const minutesAgo = (minutes: number): Date => new Date(Date.now() - minutes * 60_000);

/** One row per age, so the whole ladder — counter, then hours, then a date — reads at once. */
const LADDER: Array<{ label: string; minutes: number }> = [
  { label: 'just now', minutes: 0 },
  { label: 'a minute', minutes: 1 },
  { label: 'under an hour', minutes: 42 },
  { label: 'past the hour, still minutes', minutes: 90 },
  { label: 'hours', minutes: 5 * 60 },
  { label: 'most of a day', minutes: 23 * 60 },
  { label: 'yesterday', minutes: 26 * 60 },
  { label: 'last month', minutes: 40 * 24 * 60 },
  { label: 'another year', minutes: 400 * 24 * 60 },
];

const DefaultStory = () => (
  <div className='grid grid-cols-[min-content_1fr_min-content] gap-x-4 gap-y-1 text-sm'>
    {LADDER.map(({ label, minutes }) => (
      <Fragment key={label}>
        <span className='text-right text-description tabular-nums'>{minutes.toLocaleString()}</span>
        <span className='text-description'>{label}</span>
        <Timestamp date={minutesAgo(minutes)} classNames='text-right' />
      </Fragment>
    ))}
  </div>
);

const meta = {
  title: 'ui/react-ui-core/components/Timestamp',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'centered' }),
    // The tooltip's provider: the component renders a trigger, and a trigger with no root shows
    // nothing on hover — which is the half of this component a story exists to check.
    (Story) => (
      <Tooltip.Provider>
        <Story />
      </Tooltip.Provider>
    ),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The ladder: `now`, minutes to two hours, hours to a day, then a calendar date. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('now')).resolves.toBeTruthy();
    await expect(canvas.findByText('1m')).resolves.toBeTruthy();
    await expect(canvas.findByText('42m')).resolves.toBeTruthy();
    // Past the hour and still minutes: `90m` is a duration a reader feels, `1.5h` one they compute.
    await expect(canvas.findByText('90m')).resolves.toBeTruthy();
    await expect(canvas.findByText('5h')).resolves.toBeTruthy();
    await expect(canvas.findByText('23h')).resolves.toBeTruthy();
    // Beyond a day the count stops and the calendar locates it instead.
    await expect(canvas.queryByText('26h')).toBeNull();
  },
};

/**
 * The instant in full, on hover: everything the compact form shows is lossy, so the timestamp has to
 * be a hover away rather than gone.
 */
export const Tooltips: Story = {
  render: () => <Timestamp date={minutesAgo(90)} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const time = await canvas.findByText('90m');
    await userEvent.hover(time);
    // The tooltip renders in a portal, so it is found on the document rather than in the canvas.
    await waitFor(
      async () => {
        const tooltip = within(document.body).queryAllByRole('tooltip');
        await expect(tooltip.length).toBeGreaterThan(0);
        // The year is the part of a full timestamp no compact form ever shows.
        await expect(tooltip.map((el) => el.textContent).join(' ')).toContain(String(new Date().getFullYear()));
      },
      { timeout: 5_000 },
    );
  },
};

/**
 * The counter is live, and ticks when the value changes rather than on a fixed interval. The story
 * moves the timestamp instead of waiting out a minute: the component reschedules from whatever it is
 * given, which is the behaviour a fixed-interval counter gets wrong as a row ages.
 */
export const Live: Story = {
  render: () => {
    const [minutes, setMinutes] = useState(1);
    useEffect(() => {
      const timer = setInterval(() => setMinutes((minutes) => minutes + 1), 500);
      return () => clearInterval(timer);
    }, []);
    return (
      <div className='flex flex-col items-center gap-2 text-sm'>
        <Timestamp date={minutesAgo(minutes)} />
        <span className='text-description'>a minute older every half second</span>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('1m')).resolves.toBeTruthy();
    await waitFor(async () => await expect(canvas.queryByText('1m')).toBeNull(), { timeout: 5_000 });
  },
};

/**
 * The component's own timer, with nothing else moving: the instant is fixed at half a second short
 * of a minute old, so the only thing that can turn `now` into `1m` is the timeout `Timestamp`
 * scheduled for itself.
 *
 * `Live` above cannot prove that — it moves the date, which re-runs the effect, so it would pass
 * even if no timer ever fired.
 */
export const Ticks: Story = {
  render: () => {
    // Held in state so the identity never changes: a date built during render would give the effect
    // a new dependency every time, which is the very thing this story exists to rule out.
    //
    // Two seconds short of the minute, not half of one: the story has to observe `now` BEFORE the
    // tick, and a 500ms window is inside the render-and-query latency of a loaded runner — the
    // label would already read `1m` and the first assertion would fail for a reason that is not
    // the component's.
    const [date] = useState(() => new Date(Date.now() - 58_000));
    return <Timestamp date={date} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.findByText('now')).resolves.toBeTruthy();
    // ~2s later by the component's own reckoning; the budget is generous for a loaded runner.
    await waitFor(async () => await expect(canvas.queryByText('1m')).not.toBeNull(), { timeout: 10_000 });
  },
};

/** Pinned to a fixed instant, which is how a test or a fixture keeps the value still. */
export const Pinned: Story = {
  render: () => {
    const now = new Date('2026-09-24T12:00:00Z');
    return <Timestamp date={new Date(now.getTime() - 90 * 60_000)} now={now} />;
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).findByText('90m')).resolves.toBeTruthy();
  },
};
