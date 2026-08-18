//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';
import { expect } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type FeedScenario, MessageWindow, createScenario } from '../../testing';

/**
 * Real messages, placed by the new module.
 *
 * `placement/*` proves the shape against boxes that cannot lie about their size, and `baseline/*`
 * proves the current engine against real editors. This is where they meet: the same fixtures, the
 * same renderers and the same chrome as a feed, placed by `Window`. The invariants are deliberately
 * the ones `baseline/*` already asserts — a replacement is ready when it satisfies the tests the
 * thing it replaces satisfies, not when it satisfies tests written for it.
 *
 * Not wired into `MessageList.Root`: Root owns the follow, the sticky tail, the anchors and the
 * cursor as well as the virtualizer, so swapping the placement inside it is a reimplementation. This
 * is what that reimplementation will be checked against.
 */
const Story = ({ scenario, count }: { scenario: FeedScenario; count: number }) => {
  const definition = useMemo(() => createScenario({ scenario, count }), [scenario, count]);

  return (
    <MessageWindow
      messages={definition.messages}
      renderer={definition.renderer}
      Chrome={definition.Chrome}
      Custom={definition.Custom}
      estimateSize={definition.estimateSize}
    />
  );
};

const meta: Meta<typeof Story> = {
  title: 'ui/react-ui-feed/bridge',
  component: Story,
  decorators: [withLayout({ layout: 'column', classNames: 'w-[50rem]' }), withTheme()],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type StoryObject = StoryObj<typeof Story>;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

const settle = async (frames = 40) => {
  for (let frame = 0; frame < frames; frame++) {
    await nextFrame();
  }
};

/**
 * Nothing moves once it has settled.
 *
 * The same reading `baseline/fill` takes of the current engine: rows are tracked by index, and with
 * nothing scrolling the feed, a mounted row that moves is a defect. It is the first invariant the
 * replacement has to satisfy, and the one the old engine could only satisfy by correcting itself
 * afterwards.
 */
const holdsStill = (scenario: FeedScenario, count: number): StoryObject => ({
  args: { scenario, count },
  play: async ({ canvasElement }) => {
    const scroller = canvasElement.querySelector<HTMLElement>('[data-testid="window.scroller"]')!;
    const read = () =>
      new Map(
        [...scroller.querySelectorAll<HTMLElement>('[data-index]')].map((row) => [
          Number(row.dataset.index),
          Math.round(row.getBoundingClientRect().top),
        ]),
      );

    // Settle first: the first fill measures, and measuring is allowed to move things.
    await settle();
    const before = read();
    await settle(60);
    const after = read();

    const moved = [...after].filter(([index, top]) => before.has(index) && Math.abs(before.get(index)! - top) > 1);

    // And the end has to be reachable, which is what says the extents are real.
    //
    // "Nothing moved" alone is satisfied by a list that never measures anything — verified by
    // disabling measurement, at which point the story still passed. Scrolling to the end exercises
    // the sizer, and the sizer is only right if the measured extents reached it.
    scroller.scrollTop = scroller.scrollHeight;
    await settle();
    const last = scroller.querySelector<HTMLElement>(`[data-index="${count - 1}"]`);
    const rests =
      !!last && Math.abs(last.getBoundingClientRect().bottom - scroller.getBoundingClientRect().bottom) <= 2;

    await expect({ mounted: after.size > 0, moved: moved.map(([index]) => index), rests }).toEqual({
      mounted: true,
      moved: [],
      rests: true,
    });
  },
});

/** Fixed-height rows, no editor: whatever moves here is the placement and nothing else. */
export const Plain: StoryObject = holdsStill('plain', 200);

/** One editor per row, all identical. */
export const Uniform: StoryObject = holdsStill('uniform', 200);

/** A chat's shape: per-message renderers, block widgets, a per-message estimate. */
export const Assistant: StoryObject = holdsStill('assistant', 200);
