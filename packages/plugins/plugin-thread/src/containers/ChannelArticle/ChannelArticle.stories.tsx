//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';
import { Channel } from '@dxos/types';

import { translations } from '#translations';

import {
  SEEDED,
  STORY_TIMEOUT,
  channelStoryDecorators,
  chrome,
  control,
  hoverToolbar,
  hoverUntil,
  row,
} from '../testing';
import { ChannelArticle, type ChannelArticleProps } from './ChannelArticle';

// TODO(wittjosiah): Channel doesn't render full height.
const DefaultStory = ({ roomId }: ChannelArticleProps) => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  if (!channel) {
    return <Loading data={{ channel }} />;
  }

  return <ChannelArticle subject={channel} attendableId='story' roomId={roomId} role='article' />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelArticle',
  component: ChannelArticle,
  render: DefaultStory,
  decorators: channelStoryDecorators,
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChannelArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

const ARGS = {
  // Fixed room for testing.
  subject: undefined,
  attendableId: 'story',
  role: AppSurface.Article.role,
  roomId: '04a1d1911703b8e929d0649021a965',
};

/** Id of the message whose body is this line, which is what scopes its chrome. */
const messageId = (canvasElement: HTMLElement, match: string): string => {
  const id = row(canvasElement, match).getAttribute('data-message-id');
  if (!id) {
    throw new Error(`No message id on the line matching ${match}`);
  }

  return id;
};

/** Waits for the seeded conversation to render, which needs an identity and a space first. */
const ready = async (canvasElement: HTMLElement): Promise<void> => {
  await waitFor(async () => {
    await expect(within(canvasElement).queryByText(SEEDED.own)).not.toBeNull();
  }, STORY_TIMEOUT);
};

/**
 * Raises a message's toolbar, opens its overflow menu — where edit and delete live — and picks an
 * item. Menu content is portaled to the body, so its items resolve on the document, not the canvas.
 */
const openOverflow = async (canvasElement: HTMLElement, match: string, testId: string): Promise<void> => {
  await hoverUntil(canvasElement, match, 'thread.message.more');
  await userEvent.click(control(canvasElement, 'thread.message.more')!);
  await userEvent.click(await screen.findByTestId(testId));
  // The menu restores focus to its trigger as it unmounts, which would swallow anything typed next.
  await waitFor(() => expect(screen.queryByTestId(testId)).toBeNull());
};

export const Default: Story = { args: ARGS };

/** The main view lists roots only — a threaded reply appears as a count, never as its own row. */
export const Roots: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    await expect(canvas.queryByText(SEEDED.reply)).toBeNull();
    await expect(await canvas.findByText('1 reply')).toBeVisible();
  },
};

/**
 * A thread exists only where one was created: that root shows its summary row, the plain
 * message shows none and offers the create affordance instead.
 */
export const ThreadsAreCreated: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    // One thread in the fixture, so exactly one summary row — not one per message.
    await expect(canvasElement.querySelectorAll('[data-testid="thread.message.open-thread"]')).toHaveLength(1);

    // The thread slot reflects the hovered message's state: view on the threaded one, start on a plain one.
    await hoverUntil(canvasElement, SEEDED.other, 'thread.message.view-thread');
    await expect(control(canvasElement, 'thread.message.start-thread')).toBeNull();

    await hoverUntil(canvasElement, SEEDED.own, 'thread.message.start-thread');
    await expect(control(canvasElement, 'thread.message.view-thread')).toBeNull();
  },
};

/** Delete is offered on the local identity's own message and withheld on everyone else's. */
export const DeleteOwnOnly: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();

    // Someone else's message carries no overflow menu at all, since edit and delete are all it holds.
    hoverMessage(canvasElement, SEEDED.other);
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="thread.document.toolbar"]')).not.toBeNull());
    await expect(control(canvasElement, 'thread.message.more')).toBeNull();

    // Deleting tombstones the feed item, so the message leaves the list — no "deleted" stub is
    // rendered because the feed query already excludes tombstoned items.
    await openOverflow(canvasElement, SEEDED.own, 'thread.message.delete');
    await waitFor(async () => {
      await expect(canvas.queryByText(SEEDED.own)).toBeNull();
    }, STORY_TIMEOUT);
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
  },
};

/**
 * The main channel offers "start a thread" and withholds reply; inside a thread it is the other way
 * round (see the ChannelThreadArticle stories). That asymmetry is what pushes conversation into
 * threads rather than growing the channel.
 */
export const ThreadAffordances: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    await hoverUntil(canvasElement, SEEDED.own, 'thread.message.start-thread');
    await expect(control(canvasElement, 'thread.message.reply')).toBeNull();
  },
};

/**
 * Creating a thread declares its root, which is what makes the summary row appear — and turns that
 * message's start affordance into "view thread" rather than removing it.
 */
export const CreateThread: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);
    await expect(canvasElement.querySelectorAll('[data-testid="thread.message.open-thread"]')).toHaveLength(1);

    await hoverUntil(canvasElement, SEEDED.own, 'thread.message.start-thread');
    await userEvent.click(control(canvasElement, 'thread.message.start-thread')!);

    await waitFor(async () => {
      // The mark lands on the message, so it now carries a thread too: its summary row appears...
      await expect(canvasElement.querySelectorAll('[data-testid="thread.message.open-thread"]')).toHaveLength(2);
    }, STORY_TIMEOUT);
    // ...and its slot turns from start into view. Re-hovered on each attempt: the summary row
    // lands as its own widget, which rebuilds the chrome the pointer was over.
    await hoverUntil(canvasElement, SEEDED.own, 'thread.message.view-thread');
  },
};

/**
 * Editing is a mode, not a button swap: the row becomes an input in place, states how to commit, and
 * Enter saves. The text is never lifted into a nested editor — it stays the document's own line.
 */
export const EditMessage: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    await openOverflow(canvasElement, SEEDED.own, 'thread.message.edit');
    await expect(await canvas.findByTestId('thread.message.edit-hint')).toBeVisible();
    await waitFor(() => expect(canvasElement.querySelector('.cm-message-row--editing')).not.toBeNull());
    // Only that row: the rest of the channel is untouched.
    await expect(canvasElement.querySelectorAll('.cm-message-row--editing')).toHaveLength(1);

    await userEvent.keyboard(' Edited.');
    await expect(row(canvasElement, SEEDED.own).textContent).toContain('Edited.');
    await userEvent.keyboard('{Enter}');

    await waitFor(async () => {
      // Committing leaves edit mode, so the box and hint go with it — and the edit survives, which
      // means it reached the message rather than only the document.
      await expect(canvasElement.querySelector('.cm-message-row--editing')).toBeNull();
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
      await expect(row(canvasElement, SEEDED.own).textContent).toContain('Edited.');
    }, STORY_TIMEOUT);
  },
};

/** Escape leaves edit mode without writing, so the body is unchanged. */
export const CancelEdit: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    await openOverflow(canvasElement, SEEDED.own, 'thread.message.edit');
    await waitFor(() => expect(canvasElement.querySelector('.cm-message-row--editing')).not.toBeNull());

    await userEvent.keyboard(' Discarded.');
    await expect(row(canvasElement, SEEDED.own).textContent).toContain('Discarded.');
    await userEvent.keyboard('{Escape}');

    await waitFor(async () => {
      await expect(canvasElement.querySelector('.cm-message-row--editing')).toBeNull();
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
    }, STORY_TIMEOUT);
    // The draft never reached the message, so the document renders the stored text again.
    await expect(row(canvasElement, SEEDED.own).textContent).not.toContain('Discarded.');
  },
};

/**
 * Every message in a group is addressable on its own — the fixture's first two messages share a
 * sender and so render under a single heading, and reacting to the second must land on the second.
 */
export const GroupedMessageControls: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);
    await expect(await canvas.findByText(SEEDED.ownFollowUp)).toBeVisible();

    const first = messageId(canvasElement, SEEDED.own);
    const second = messageId(canvasElement, SEEDED.ownFollowUp);
    await expect(second).not.toBe(first);

    // The run shares one heading, yet the toolbar follows the pointer down to the second row.
    await hoverUntil(canvasElement, SEEDED.ownFollowUp, 'thread.message.reaction-option');
    await expect(
      canvasElement.querySelectorAll(
        '[data-testid="thread.document.toolbar"] [data-testid="thread.message.reaction-option"]',
      ),
    ).toHaveLength(3);
    await userEvent.click(control(canvasElement, 'thread.message.reaction-option')!);

    // The pill lands on the message that was reacted to, not on the one that heads the group.
    await waitFor(async () => {
      await expect(chrome(canvasElement, second, 'thread.message.reaction')).toHaveLength(1);
    }, STORY_TIMEOUT);
    await expect(chrome(canvasElement, first, 'thread.message.reaction')).toHaveLength(0);
  },
};

/** The first few reactions sit inline in the toolbar; clicking one adds a pill with its count. */
export const React_: Story = {
  name: 'React',
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    // Three inline options on the hovered message, no menu to open first.
    const option = await hoverUntil(canvasElement, SEEDED.own, 'thread.message.reaction-option');
    await expect(
      canvasElement.querySelectorAll(
        '[data-testid="thread.document.toolbar"] [data-testid="thread.message.reaction-option"]',
      ),
    ).toHaveLength(3);
    await userEvent.click(option);

    const id = messageId(canvasElement, SEEDED.own);
    await waitFor(async () => {
      const [pill] = chrome(canvasElement, id, 'thread.message.reaction');
      await expect(pill).toBeVisible();
      await expect(pill).toHaveAttribute('aria-pressed', 'true');
    }, STORY_TIMEOUT);
  },
};

/**
 * Anything outside the inline set comes from the full emoji picker, opened in a popover from the
 * toolbar. Only the popover is asserted here: emoji-mart renders its grid inside a shadow root, so a
 * play cannot reach an emoji to click — picking one is covered by the inline options above.
 */
export const ReactFromPicker: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    await hoverUntil(canvasElement, SEEDED.own, 'thread.message.react');
    await userEvent.click(control(canvasElement, 'thread.message.react')!);
    const picker = await screen.findByTestId('thread.message.reaction-picker', {}, STORY_TIMEOUT);
    await expect(picker).toBeVisible();
    // The grid is emoji-mart's own element, mounted inside the popover.
    await expect(picker.querySelector('em-emoji-picker')).not.toBeNull();

    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(screen.queryByTestId('thread.message.reaction-picker')).toBeNull();
    }, STORY_TIMEOUT);
  },
};
