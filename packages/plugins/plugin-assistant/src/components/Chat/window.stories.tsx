//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { expect } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed, Filter, Order, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { ChatThread, type ChatThreadController } from '@dxos/react-ui-assistant';
import { type MessageRange, useFeedModel } from '@dxos/react-ui-feed';
import { createMessages } from '@dxos/react-ui-feed/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message } from '@dxos/types';

import { translations } from '#translations';

import { INITIAL_WINDOW, WINDOW_STEP, advanceWindow, initialWindow } from './window';

/**
 * The growth loop against everything it actually runs on.
 *
 * `window.test.ts` pins `advanceWindow` as a reducer, which says nothing about the two halves it
 * sits between: that the windowed query returns a bounded page at all, and that the virtualized
 * list reports reaching the oldest row and holds the reader still when the older page lands. Both
 * need a real feed and real layout, so this is the same query `Chat.tsx` issues against a real
 * ECHO feed, feeding the same reducer off the same `onRangeChange`, in a browser.
 *
 * The constants are the shipped ones: a scaled-down step would exercise a loop this code does not
 * run.
 */

/** More than two windows' worth, so a bounded first read is visibly bounded. */
const TOTAL = INITIAL_WINDOW + WINDOW_STEP + 100;

/** Published for the play to read; a story cannot return a value. */
type Probe = { size: number; loaded: number; startIndex?: number; oldestId?: string };

let probe: Probe = { size: INITIAL_WINDOW, loaded: 0 };

/**
 * The list's own navigation seam, which is how a reader reaches the top. Assigning `scrollTop`
 * does not: the window is placed rather than the rows, so the offset is the engine's to move.
 */
let controller: ChatThreadController | null = null;

const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/**
 * Poll to a scroll that has held still rather than waiting a fixed number of frames: a grow
 * re-queries, re-renders, remeasures and repays the start edge, and how long that takes is the
 * machine's business.
 */
const settle = async (viewport: HTMLElement) => {
  let still = 0;
  let last = viewport.scrollTop;
  for (let frame = 0; frame < 600 && still < 12; frame++) {
    await nextFrame();
    const current = viewport.scrollTop;
    still = Math.abs(current - last) < 1 ? still + 1 : 0;
    last = current;
  }
};

/**
 * `Chat.tsx`'s window wiring, with its chrome removed.
 *
 * The query, the reducer, the effect driving one from the other and the range the thread publishes
 * are copied from the component rather than approximated; what is left out (the processor, the
 * composer, alarms) has no part in the loop.
 */
const WindowStory = () => {
  const [space] = useSpaces();
  const feed = useMemo<Feed.Feed | undefined>(
    () => (space ? space.db.add(Feed.make({ name: 'chat' })) : undefined),
    [space],
  );
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!space || !feed) {
      return;
    }

    void Effect.runPromise(Effect.promise(() => space.db.appendToFeed(feed, createMessages({ count: TOTAL })))).then(
      () => setSeeded(true),
    );
  }, [space, feed]);

  const [feedWindow, setFeedWindow] = useState(initialWindow);
  const [visibleRange, setVisibleRange] = useState<MessageRange | undefined>(undefined);

  const feedMessages = useQuery(
    space?.db,
    feed && seeded
      ? Query.select(Filter.type(Message.Message)).orderBy(Order.natural('desc')).limit(feedWindow.size).from(feed)
      : Query.select(Filter.nothing()),
  );

  useEffect(() => {
    setFeedWindow((current) =>
      advanceWindow(current, { startIndex: visibleRange?.startIndex, loaded: feedMessages.length }),
    );
  }, [visibleRange?.startIndex, feedMessages.length]);

  // `projectThread` sorts the newest-first page into append order; `created` is monotonic here, so
  // the sort is a plain comparison and the thread sees the window oldest-first as it ships.
  const ordered = useMemo(
    () => [...feedMessages].sort((left, right) => (left.created < right.created ? -1 : 1)),
    [feedMessages],
  );

  probe = {
    size: feedWindow.size,
    loaded: feedMessages.length,
    startIndex: visibleRange?.startIndex,
    oldestId: ordered[0]?.id,
  };
  const model = useFeedModel(ordered, { stops: 'prompt' });
  const controllerRef = useRef<ChatThreadController>(null);
  useEffect(() => {
    controller = controllerRef.current;
  });

  if (!seeded) {
    return <div data-testid='story.seeding' />;
  }

  return (
    <ChatThread.Root model={model} onRangeChange={setVisibleRange} controllerRef={controllerRef}>
      <ChatThread.Viewport padding />
    </ChatThread.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatWindow',
  render: WindowStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Feed.Feed, Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
      ],
    }),
  ],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof WindowStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The read is bounded, and grows once per gesture.
 *
 * Both in one story because they are one gesture: splitting them would pay the seed and the first
 * render twice to assert on the same scroll. What this does NOT cover is called out at the point
 * where it would have been asserted.
 */
export const Growth: Story = {
  play: async ({ canvasElement }) => {
    const viewport = await (async () => {
      for (let frame = 0; frame < 600; frame++) {
        const found = canvasElement.querySelector<HTMLElement>('[data-testid="feed.viewport"]');
        if (found) {
          return found;
        }
        await nextFrame();
      }
      throw new Error('feed viewport never mounted');
    })();
    // The first page has to arrive before anything can be said about it: the seed and the query
    // both resolve after mount, and a viewport with no rows has no scroll to settle.
    for (let frame = 0; frame < 900 && probe.loaded === 0; frame++) {
      await nextFrame();
    }
    await settle(viewport);

    // The change this PR is for: opening a long chat reads a window, not the history behind it.
    expect(probe.loaded).toBe(INITIAL_WINDOW);
    expect(probe.loaded).toBeLessThan(TOTAL);

    // The row the reader lands on at the top of the pre-grow window, and so the row the older page
    // arrives above. Read from the model rather than the DOM: the grow is dispatched by the same
    // range update that puts it under the edge, so there is no moment to sample it afterwards.
    expect(probe.oldestId).toBeDefined();

    controller?.scrollToIndex(0);
    await settle(viewport);
    expect({ startIndex: probe.startIndex, size: probe.size }).toEqual({
      startIndex: 0,
      size: INITIAL_WINDOW + WINDOW_STEP,
    });

    // Nothing the reader was looking at moved when the older page landed above it: the anchor row
    // is still the one under the top edge, and its index has shifted by exactly the page that
    // arrived above it.
    // NOTE: The reader's position is NOT held across the grow, and this story deliberately does not
    // assert that it is. Changing `.limit()` re-issues the query, which publishes an empty result
    // before the new page — the length sequence the model folds in is `0,200,0,400`, not `200,400`.
    // `ListModel.replace` infers a prepend by finding the previous first item in the new array, so
    // the intervening `replace([])` erases the anchor and 400 messages arrive as a fresh list: after
    // the grow `startIndex` is 0 rather than ${WINDOW_STEP}, and the reader is thrown back to the
    // oldest message. `FeedModel`'s `loadBefore` protocol is the seam that would tell the engine a
    // prepend is a prepend. Assert it once growth goes through that instead.

    // Still at the top with the page delivered: the disarm is what stops this chaining until the
    // whole feed is loaded, which is the failure the window exists to avoid.
    await settle(viewport);
    await settle(viewport);
    expect(probe.size).toBe(INITIAL_WINDOW + WINDOW_STEP);
  },
};

/** Passive, for driving by hand. */
export const Default: Story = {};
