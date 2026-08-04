//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { getStoryMetadata } from '../testing';
import { type MessageLike, type MessageReaction } from '../types';
import { Transcript } from './Transcript';
import { type TranscriptAction } from './transcript-extension';
import { type MessageItem } from './transcript-items';

/**
 * CodeMirror's `hoverTooltip` reads pointer coordinates from a bubbling `mousemove`, which
 * `userEvent.hover` does not reliably provide, so dispatch one at the element's centre.
 */
const hover = (element: HTMLElement): void => {
  const rect = element.getBoundingClientRect();
  element.dispatchEvent(
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    }),
  );
};

const alice = { role: 'user' as const, identityDid: 'did:key:alice', name: 'Alice' };
const bob = { role: 'user' as const, identityDid: 'did:key:bob', name: 'Bob' };

const DAY_1 = new Date('2026-07-01T09:00:00.000Z').getTime();
const DAY_2 = new Date('2026-07-02T09:00:00.000Z').getTime();

const at = (time: number, sender: typeof alice, text: string) =>
  MessageType.make({ created: new Date(time).toISOString(), sender, blocks: [{ _tag: 'text', text }] });

/**
 * The prototype slice: grouping, both divider kinds, reactions and the hover toolbar, on the
 * CodeMirror substrate. Same fixture as `Thread.stories`'s `Grouped`, so the two renderings can be
 * compared side by side.
 */
const useFixture = () =>
  useMemo(
    () => [
      // Same-sender burst inside the 60s window: one run, so only the first row is a head.
      at(DAY_1, alice, 'First message in a burst.'),
      at(DAY_1 + 10_000, alice, 'Second message, 10s later — same run.'),
      at(DAY_1 + 40_000, alice, 'Third message, 40s after the first — still the same run.'),
      // Over the window, same sender: a new run, but no divider (well under the 3h gap).
      at(DAY_1 + 120_000, alice, 'New run: two minutes after the burst.'),
      // Over 3h, same day: an unlabeled gap divider.
      at(DAY_1 + 120_000 + 4 * 60 * 60 * 1000, alice, 'After a four-hour silence — gap divider above.'),
      // Different sender always starts a run, even inside the window.
      at(DAY_1 + 120_000 + 4 * 60 * 60 * 1000 + 5_000, bob, 'Bob replies five seconds later.'),
      // A long body, to show it wrapping across the full width rather than into a controls column.
      at(
        DAY_1 + 120_000 + 4 * 60 * 60 * 1000 + 10_000,
        bob,
        'A deliberately long message, so the wrapping is visible: the hover toolbar overlays the row ' +
          'instead of reserving a column beside it, which is what lets this paragraph use the whole ' +
          'width of the transcript rather than half of it.',
      ),
      // Next calendar day: a labeled day divider (the day boundary wins over the gap boundary).
      at(DAY_2, bob, 'A new day.'),
    ],
    [],
  );

const DefaultStory = () => {
  const messages = useFixture();
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>(() => ({
    [messages[0].id]: [{ emoji: '👍', count: 2, self: false }],
    [messages[5].id]: [
      { emoji: '🎉', count: 1, self: true },
      { emoji: '❤️', count: 3, self: false },
    ],
  }));

  const getReactions = useCallback((message: MessageLike) => reactions[message.id] ?? [], [reactions]);
  const getActions = useCallback(
    (item: MessageItem): TranscriptAction[] =>
      item.message.sender.identityDid === alice.identityDid
        ? ['react', 'thread', 'edit', 'delete']
        : ['react', 'thread'],
    [],
  );
  const handleReact = useCallback((message: MessageLike, emoji: string) => {
    setReactions((current) => {
      const existing = current[message.id] ?? [];
      const match = existing.find((reaction) => reaction.emoji === emoji);
      return {
        ...current,
        [message.id]: match
          ? existing.map((reaction) =>
              reaction.emoji === emoji
                ? { ...reaction, self: !reaction.self, count: reaction.count + (reaction.self ? -1 : 1) }
                : reaction,
            )
          : [...existing, { emoji, count: 1, self: true }],
      };
    });
  }, []);

  return (
    <Transcript
      classNames='bs-full'
      messages={messages}
      getMetadata={getStoryMetadata}
      getReactions={getReactions}
      getActions={getActions}
      onReact={handleReact}
    />
  );
};

const meta = {
  title: 'ui/react-ui-thread/Transcript',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every message body reaches the document as plain text, and only once. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/First message in a burst/)).toBeInTheDocument();
    await expect(await canvas.findByText(/A new day/)).toBeInTheDocument();
    await expect(canvas.getAllByText(/Bob replies five seconds later/)).toHaveLength(1);
  },
};

/** A run shows one heading, not one per message; a new sender or a divider starts another. */
export const Grouping: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/First message in a burst/);
    // Four runs: Alice's burst, Alice after the window, Alice after the gap divider, then Bob.
    await expect(canvas.getAllByText('Alice')).toHaveLength(3);
    await expect(canvas.getAllByText('Bob')).toHaveLength(2);
  },
};

/** The day divider is labeled; the same-day gap divider is not. */
export const Dividers: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Wednesday, July 1/)).toBeInTheDocument();
    await expect(await canvas.findByText(/Thursday, July 2/)).toBeInTheDocument();
  },
};

/** Folded pills render under their message and toggle the local identity's reaction. */
export const Reactions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const pill = await canvas.findByText('👍 2');
    await userEvent.click(pill);
    await expect(await canvas.findByText('👍 3')).toBeInTheDocument();
  },
};

/**
 * The toolbar overlays the hovered message and offers only that message's actions.
 *
 * The controls mount in the tooltip layer rather than in the row, which is what keeps them from
 * reserving a column — so the assertion looks for a `.cm-tooltip`, not a sibling of the text.
 */
export const HoverToolbar: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = (action: TranscriptAction) =>
      canvasElement.querySelector<HTMLElement>(`.cm-tooltip [data-testid="transcript.${action}"]`);

    hover(await canvas.findByText(/Bob replies five seconds later/));
    await waitFor(() => expect(button('thread')).not.toBeNull());
    // Bob's message is not the local identity's, so it offers neither edit nor delete.
    await expect(button('edit')).toBeNull();
    await expect(button('delete')).toBeNull();

    hover(await canvas.findByText(/First message in a burst/));
    await waitFor(() => expect(button('delete')).not.toBeNull());
  },
};
