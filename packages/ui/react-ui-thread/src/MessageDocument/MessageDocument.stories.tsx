//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import { getStoryMetadata } from '../testing';
import { type MessageLike, type MessageReaction, type MessageThreadSummary } from '../types';
import { type MessageAction } from './message-document-extension';
import { type MessageItem } from './message-document-items';
import { MessageDocument } from './MessageDocument';

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
 * CodeMirror substrate.
 *
 * Built on the same boundaries `Thread.stories`'s `Grouped` uses — two calendar days and the
 * 10s/40s/2m/4h offsets that straddle the grouping window and the gap threshold — so both
 * renderings are driven across the same cases, plus a long message the tile fixture has no reason
 * to carry: wrapping is the thing the overlay toolbar is meant to buy back.
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
    (item: MessageItem): MessageAction[] =>
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
    <MessageDocument
      classNames='bs-full'
      messages={messages}
      getMetadata={getStoryMetadata}
      getReactions={getReactions}
      getActions={getActions}
      onReact={handleReact}
    />
  );
};

/**
 * The channel view: roots only, each carrying its thread affordance. Discord's asymmetry — the
 * channel offers start-thread and withholds reply, which is what pushes conversation into threads.
 */
const ChannelStory = () => {
  const messages = useFixture();
  const [currentId, setCurrentId] = useState<string>();
  const threads = useMemo<Record<string, MessageThreadSummary>>(
    () => ({
      [messages[0].id]: { replyCount: 3, name: 'Deploy plan', lastActivity: new Date(DAY_1 + 900_000).toISOString() },
      [messages[5].id]: { replyCount: 0 },
    }),
    [messages],
  );

  return (
    <MessageDocument
      classNames='bs-full'
      messages={messages}
      currentId={currentId}
      getMetadata={getStoryMetadata}
      getThreadSummary={(message) => threads[message.id]}
      getActions={() => ['react', 'thread', 'delete']}
      onSelect={(message) => setCurrentId(message.id)}
      onThreadOpen={(message) => setCurrentId(message.id)}
    />
  );
};

/**
 * A thread's own view: replies, quote-replies, and the reply affordance in place of start-thread —
 * threads do not nest, so the channel's start-thread is withheld here.
 */
const ThreadStory = () => {
  const root = useMemo(() => at(DAY_1, alice, 'Should we cut the release today?'), []);
  const replies = useMemo(
    () => [
      at(DAY_1 + 60_000, bob, 'I would wait for the migration to land.'),
      at(DAY_1 + 120_000, alice, 'Agreed — tomorrow then.'),
    ],
    [],
  );
  const messages = useMemo(() => [root, ...replies], [root, replies]);

  return (
    <MessageDocument
      classNames='bs-full'
      messages={messages}
      getMetadata={getStoryMetadata}
      // The second reply answers the first; the host resolves the target, this package never
      // follows the ref itself.
      getQuote={(message) =>
        message.id === replies[1].id
          ? { authorName: 'Bob', text: 'I would wait for the migration to land.' }
          : undefined
      }
      getActions={() => ['react', 'reply', 'delete']}
    />
  );
};

/** Edit in place: the row itself becomes writable, with the draft held in memory until submit. */
const EditingStory = ({ incoming }: { incoming?: boolean }) => {
  const [messages, setMessages] = useState(() => [
    at(DAY_1, alice, 'The original text.'),
    at(DAY_1 + 120_000, bob, 'Another message, to show only one row is writable.'),
  ]);
  const [editingId, setEditingId] = useState<string>();

  // Stands in for a peer revising the message you are editing, and for unrelated traffic: the
  // draft must survive the first, and the second must keep arriving regardless.
  useEffect(() => {
    if (!incoming || !editingId) {
      return;
    }
    const timer = setTimeout(() => {
      setMessages((current) => [
        MessageType.make({ ...current[0], blocks: [{ _tag: 'text', text: 'Overwritten by a peer.' }] }),
        ...current.slice(1),
        at(DAY_1 + 240_000, bob, 'An unrelated message that arrived while you were typing.'),
      ]);
    }, 100);
    return () => clearTimeout(timer);
  }, [incoming, editingId]);

  return (
    <MessageDocument
      classNames='bs-full'
      messages={messages}
      editingId={editingId}
      getMetadata={getStoryMetadata}
      getActions={() => ['edit']}
      onAction={(action, message) => action === 'edit' && setEditingId(message.id)}
      onEditCancel={() => setEditingId(undefined)}
      onEditCommit={(message, text) => {
        setMessages((current) =>
          current.map((candidate) =>
            candidate.id === message.id
              ? MessageType.make({ ...candidate, blocks: [{ _tag: 'text', text }] })
              : candidate,
          ),
        );
        setEditingId(undefined);
      }}
    />
  );
};

/**
 * A channel long enough to show what the substrate is actually for: CodeMirror renders only the
 * lines in view, so the DOM holds a fraction of the messages.
 */
const DensityStory = () => {
  const messages = useMemo(
    () =>
      Array.from({ length: 500 }, (_, index) =>
        at(DAY_1 + index * 120_000, index % 2 === 0 ? alice : bob, `Message ${index} in a long channel.`),
      ),
    [],
  );

  return (
    <MessageDocument
      classNames='bs-full'
      messages={messages}
      getMetadata={getStoryMetadata}
      getActions={() => ['react']}
    />
  );
};

const meta = {
  title: 'ui/react-ui-thread/MessageDocument',
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
    const button = (action: MessageAction) =>
      canvasElement.querySelector<HTMLElement>(`.cm-tooltip [data-testid="thread.document.${action}"]`);

    hover(await canvas.findByText(/Bob replies five seconds later/));
    await waitFor(() => expect(button('thread')).not.toBeNull());
    // Bob's message is not the local identity's, so it offers neither edit nor delete.
    await expect(button('edit')).toBeNull();
    await expect(button('delete')).toBeNull();

    hover(await canvas.findByText(/First message in a burst/));
    await waitFor(() => expect(button('delete')).not.toBeNull());
  },
};

/** Roots carry a thread row; an existing thread shows its name and count, a bare one invites one. */
export const Channel: Story = {
  render: ChannelStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Deploy plan')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('[data-testid="thread.document.open-thread"]')).toHaveLength(2);

    // Selecting a row marks it for assistive technology, which is what a tile got from being its
    // own element — the open question this prototype had to answer.
    const row = await canvas.findByText(/First message in a burst/);
    await userEvent.click(row);
    await waitFor(() =>
      expect(canvasElement.querySelector('[aria-current="location"]')?.getAttribute('data-message-id')).not.toBeNull(),
    );
  },
};

/** A reply quotes what it answers, and a thread offers reply rather than start-thread. */
export const Thread: Story = {
  render: ThreadStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByTestId('thread.document.quote')).toHaveTextContent(
      'I would wait for the migration',
    );

    hover(await canvas.findByText(/Should we cut the release/));
    await waitFor(() =>
      expect(canvasElement.querySelector('.cm-tooltip [data-testid="thread.document.reply"]')).not.toBeNull(),
    );
    await expect(canvasElement.querySelector('.cm-tooltip [data-testid="thread.document.thread"]')).toBeNull();
  },
};

/** The edited row becomes writable in place; committing writes the text back. */
export const Editing: Story = {
  render: () => <EditingStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = () => canvasElement.querySelector<HTMLElement>('[data-editing="true"]');

    hover(await canvas.findByText('The original text.'));
    const edit = () => canvasElement.querySelector<HTMLElement>('.cm-tooltip [data-testid="thread.document.edit"]');
    await waitFor(() => expect(edit()).not.toBeNull());
    await userEvent.click(edit()!);

    // No nested editor: the message's own line is what became writable.
    await waitFor(() => expect(row()).not.toBeNull());
    await expect(canvas.queryByTestId('thread.document.editor')).toBeNull();
    await expect(canvasElement.querySelector('.cm-content')?.getAttribute('contenteditable')).toBe('true');

    await userEvent.click(await canvas.findByText('The original text.'));
    await userEvent.keyboard('{End} Edited.{Enter}');
    await waitFor(() => expect(row()).toBeNull());
    await expect(await canvas.findByText(/The original text\. Edited\./)).toBeInTheDocument();
    // The other message is untouched, so the writable span really was just the one row.
    await expect(canvas.getByText(/Another message/)).toBeInTheDocument();
  },
};

/**
 * The draft is in memory until submit, so a peer revising the same message cannot overwrite what
 * is being typed — while unrelated messages keep arriving, which is the thing suspending the sync
 * would have cost.
 */
export const EditingWithIncoming: Story = {
  render: () => <EditingStory incoming />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    hover(await canvas.findByText('The original text.'));
    const edit = () => canvasElement.querySelector<HTMLElement>('.cm-tooltip [data-testid="thread.document.edit"]');
    await waitFor(() => expect(edit()).not.toBeNull());
    await userEvent.click(edit()!);
    await waitFor(() => expect(canvasElement.querySelector('[data-editing="true"]')).not.toBeNull());

    await userEvent.click(await canvas.findByText('The original text.'));
    await userEvent.keyboard('{End} mine');

    // The peer's revision of this message lands while typing and must lose to the draft.
    await waitFor(() => expect(canvas.getByText(/An unrelated message that arrived/)).toBeInTheDocument());
    await expect(canvas.queryByText(/Overwritten by a peer/)).toBeNull();
    await expect(await canvas.findByText(/The original text\. mine/)).toBeInTheDocument();
  },
};

/** 500 messages, of which only the visible ones reach the DOM. */
export const Density: Story = {
  render: DensityStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/Message 499 in a long channel/);
    const lines = canvasElement.querySelectorAll('.cm-line');
    // The measurement the prototype owed: rendered lines stay a small fraction of the channel, so
    // widget density is bounded by the viewport rather than by history.
    await expect(lines.length).toBeLessThan(120);
  },
};
