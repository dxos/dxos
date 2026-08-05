//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Message as MessageType } from '@dxos/types';

import { translations } from '#translations';

import {
  STORY_IDENTITY,
  createConversationFixture,
  createGroupedMessages,
  createMessages,
  createMixedSenderMessages,
  getStoryMetadata,
} from '../testing';
import { Thread } from '../Thread';
import { type MessageLike, type MessageReaction } from '../types';
import { type MessageAction } from './message-document-extension';
import { MessageDocument } from './MessageDocument';

/**
 * The same stories `Thread.stories` renders, on the document stack instead of the tile stack, and
 * from the same fixtures — so the two renderings can be compared story for story rather than each
 * inventing its own conversation.
 */
const DefaultStory = () => {
  const [messages, setMessages] = useState(() => createMessages(12));
  const [editingId, setEditingId] = useState<string>();

  const handleAction = useCallback((action: MessageAction, message: MessageLike) => {
    if (action === 'edit') {
      setEditingId(message.id);
    } else if (action === 'delete') {
      setMessages((current) => current.filter((candidate) => candidate.id !== message.id));
    }
  }, []);

  const handleEditCommit = useCallback((message: MessageLike, text: string) => {
    setMessages((current) =>
      current.map((candidate) =>
        candidate.id === message.id
          ? ({ ...candidate, blocks: [{ _tag: 'text', text }] } as MessageType.Message)
          : candidate,
      ),
    );
    setEditingId(undefined);
  }, []);

  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      identityDid={STORY_IDENTITY.identityDid}
      editable
      onMessageReact={() => {}}
      onMessageDelete={() => {}}
      onThreadOpen={() => {}}
      onThreadCreate={() => {}}
      canDelete={(message) => message.sender.identityDid === STORY_IDENTITY.identityDid}
    >
      <MessageDocument
        classNames='h-full'
        messages={messages}
        editingId={editingId}
        getMetadata={getStoryMetadata}
        getActions={({ message }) =>
          message.sender.identityDid === STORY_IDENTITY.identityDid
            ? ['react', 'thread', 'edit', 'delete']
            : ['react', 'thread']
        }
        onAction={handleAction}
        onEditCommit={handleEditCommit}
        onEditCancel={() => setEditingId(undefined)}
      />
    </Thread.Root>
  );
};

const MixedSendersStory = () => {
  const messages = useMemo(() => createMixedSenderMessages(), []);
  return <MessageDocument classNames='h-full' messages={messages} getMetadata={getStoryMetadata} />;
};

const GroupedStory = () => {
  const messages = useMemo(() => createGroupedMessages(), []);
  return <MessageDocument classNames='h-full' messages={messages} getMetadata={getStoryMetadata} />;
};

const ConversationStory = () => {
  const { messages, reactions: initial, threads } = useMemo(() => createConversationFixture(), []);
  const [reactions, setReactions] = useState(() => new Map(initial));

  const getReactions = useCallback((message: MessageLike) => reactions.get(message.id) ?? [], [reactions]);
  const getThreadSummary = useCallback((message: MessageLike) => threads.get(message.id), [threads]);
  const handleReact = useCallback((message: MessageLike, emoji: string) => {
    setReactions((current) => {
      const next = new Map(current);
      const existing = next.get(message.id) ?? [];
      const match = existing.find((reaction: MessageReaction) => reaction.emoji === emoji);
      next.set(
        message.id,
        match
          ? existing.map((reaction: MessageReaction) =>
              reaction.emoji === emoji
                ? { ...reaction, self: !reaction.self, count: reaction.count + (reaction.self ? -1 : 1) }
                : reaction,
            )
          : [...existing, { emoji, count: 1, self: true }],
      );
      return next;
    });
  }, []);

  return (
    <Thread.Root
      getMetadata={getStoryMetadata}
      identityDid={STORY_IDENTITY.identityDid}
      editable
      onMessageReact={() => {}}
      onMessageDelete={() => {}}
      onThreadOpen={() => {}}
      onThreadCreate={() => {}}
      canDelete={(message) => message.sender.identityDid === STORY_IDENTITY.identityDid}
    >
      <MessageDocument
        classNames='h-full'
        messages={messages}
        getMetadata={getStoryMetadata}
        getReactions={getReactions}
        getThreadSummary={getThreadSummary}
        // The host resolves a reply's target; this package never follows the ref itself.
        getQuote={(message) => {
          const parent = message.parentMessage?.target;
          if (!parent) {
            return undefined;
          }

          const text = parent.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : [])).join(' ');
          return { authorName: getStoryMetadata(parent).authorName, text };
        }}
        getActions={({ message }) =>
          message.sender.identityDid === STORY_IDENTITY.identityDid
            ? ['react', 'thread', 'edit', 'delete']
            : ['react', 'thread']
        }
        onReact={handleReact}
        onThreadOpen={() => {}}
      />
    </Thread.Root>
  );
};

const meta = {
  title: 'ui/react-ui-thread/MessageDocument',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' }), withMosaic()],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The document line whose body matches, as opposed to any element containing the text: a quote row
 * repeats the text of the message it answers, so a plain text query matches both.
 */
const row = (canvasElement: HTMLElement, match: RegExp): HTMLElement => {
  const line = Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-line')).find((line) =>
    match.test(line.textContent ?? ''),
  );
  if (!line) {
    throw new Error(`No message line matching ${match}`);
  }

  return line;
};

/**
 * The toolbar is React, but it is driven by pointer coordinates the chrome reads from a
 * `mousemove` — which `userEvent.hover` does not reliably provide, so dispatch one at the centre.
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

/** Bodies are plain text in the document, and each run's head is the tile stack's own row frame. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-line').length).toBeGreaterThan(0));
    await expect(canvasElement.querySelector('.cm-line')?.textContent?.length).toBeGreaterThan(0);
    // The same `Message.Root` the tiles use, portaled into the head widget — hence its testid.
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-testid="thread.message"]').length).toBeGreaterThan(0),
    );
  },
};

/** Every sender shape resolves a heading, including one with no `identityDid`. */
export const MixedSenders: Story = {
  render: MixedSendersStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/local identity \(Alice\)/)).toBeInTheDocument();
    await expect(await canvas.findByText(/name-only sender/)).toBeInTheDocument();
    await expect(await canvas.findByText(/different identity \(Bob\)/)).toBeInTheDocument();
    await expect(canvas.getAllByText('guest')).toHaveLength(1);
  },
};

/** A run shows one heading; a new sender, a gap or a new day starts another. */
export const Grouped: Story = {
  render: GroupedStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(/First message in a burst/);
    // Three Alice runs (the burst, past the window, past the gap divider) and two Bob runs.
    await expect(canvas.getAllByText('Alice')).toHaveLength(3);
    await expect(canvas.getAllByText('Bob')).toHaveLength(2);
    // The day divider is labeled; the same-day gap divider is not.
    await expect(await canvas.findByText(/Wednesday, July 1/)).toBeInTheDocument();
    await expect(await canvas.findByText(/Thursday, July 2/)).toBeInTheDocument();
  },
};

/**
 * Reactions, quotes, thread rows and the hover toolbar.
 *
 * Each assertion scrolls its subject into view first: only the viewport is rendered, so a widget
 * further down the conversation is genuinely absent from the DOM rather than broken.
 */
export const Conversation: Story = {
  render: ConversationStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-line').length).toBeGreaterThan(0));

    // Scroll until the wanted line exists. `scrollIntoView` cannot help here: a line outside the
    // viewport is not in the DOM at all, so there is nothing to scroll to until the scroller has
    // been moved far enough for CodeMirror to render it.
    const scroller = canvasElement.querySelector('.cm-scroller')!;
    const reveal = async (match: RegExp) => {
      const step = Math.max(scroller.clientHeight / 2, 100);
      for (let top = 0; top <= scroller.scrollHeight; top += step) {
        scroller.scrollTop = top;
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (Array.from(canvasElement.querySelectorAll('.cm-line')).some((line) => match.test(line.textContent ?? ''))) {
          return;
        }
      }

      throw new Error(`No message line matching ${match} at any scroll position`);
    };

    // A folded pill toggles the local identity's reaction. Queried by testid and re-read after the
    // click: scrolling re-creates the widget's DOM, so an element captured beforehand is stale.
    await reveal(/Reacted to once/);
    const pill = () => canvasElement.querySelector<HTMLElement>('[data-testid="thread.document.pill"]');
    await waitFor(() => expect(pill()?.textContent).toBe('👍 1'));
    await userEvent.click(pill()!);
    await waitFor(() => expect(pill()?.textContent).toBe('👍 2'));

    // A reply quotes what it answers, resolved by the host rather than by following the ref here.
    await reveal(/Quote-replying to a message above/);
    await waitFor(() =>
      expect(canvasElement.querySelectorAll('[data-testid="thread.document.quote"]').length).toBeGreaterThan(0),
    );

    // A thread row carries the thread's name and reply count.
    await reveal(/Has a busy, named thread/);
    await expect(await canvas.findByText('Release plan')).toBeInTheDocument();

    // The toolbar is the tile stack's own `Message.Controls`, floated over the hovered row rather
    // than taking a column — same quick reactions and same overflow menu.
    await reveal(/A single message of my own/);
    hover(row(canvasElement, /A single message of my own/));
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-testid="thread.message.reaction-option"]')).not.toBeNull(),
    );
  },
};
