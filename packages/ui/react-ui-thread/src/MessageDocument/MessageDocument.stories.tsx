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
    <MessageDocument
      classNames='bs-full'
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
  );
};

const MixedSendersStory = () => {
  const messages = useMemo(() => createMixedSenderMessages(), []);
  return <MessageDocument classNames='bs-full' messages={messages} getMetadata={getStoryMetadata} />;
};

const GroupedStory = () => {
  const messages = useMemo(() => createGroupedMessages(), []);
  return <MessageDocument classNames='bs-full' messages={messages} getMetadata={getStoryMetadata} />;
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
    <MessageDocument
      classNames='bs-full'
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

/** Bodies are plain text in the document, and every run carries an avatar in the gutter. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-line').length).toBeGreaterThan(0));
    await expect(canvasElement.querySelector('.cm-line')?.textContent?.length).toBeGreaterThan(0);
    await expect(canvasElement.querySelectorAll('.cm-avatar-gutter .cm-gutterElement').length).toBeGreaterThan(0);
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

/** Reactions, quotes, thread rows and the hover toolbar, across the whole gallery. */
export const Conversation: Story = {
  render: ConversationStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvasElement.querySelectorAll('.cm-line').length).toBeGreaterThan(10));

    await expect(canvasElement.querySelectorAll('[data-testid="thread.document.quote"]').length).toBe(3);
    // A single reply, a busy named one, and one hanging off a run's second row.
    await expect(canvasElement.querySelectorAll('[data-testid="thread.document.open-thread"]').length).toBe(3);
    await expect(await canvas.findByText('Release plan')).toBeInTheDocument();

    // A folded pill toggles the local identity's reaction.
    await userEvent.click(await canvas.findByText('👍 1'));
    await expect(await canvas.findByText('👍 2')).toBeInTheDocument();

    // The toolbar is `react-ui-menu`, floated over the hovered row rather than taking a column.
    hover(row(canvasElement, /A single message of my own/));
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="thread.document.edit"]')).not.toBeNull());
    // Someone else's message offers neither edit nor delete.
    hover(row(canvasElement, /A single message from another sender/));
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="thread.document.edit"]')).toBeNull());
  },
};
