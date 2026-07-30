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

import { SEEDED, STORY_TIMEOUT, channelStoryDecorators } from '../testing';
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

/**
 * Rendered text of the message editor holding `substring`. Read from the editor rather than by
 * `findByText`, which cannot match an edited line: CodeMirror splits it across several nodes, and the
 * caret sits wherever the click left it, so the insertion point is not part of what is asserted.
 */
const messageTextContaining = (canvasElement: HTMLElement, substring: string): string | undefined =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-content'))
    .map((element) => element.textContent ?? '')
    .find((text) => text.includes(substring));

export const Default: Story = {
  args: {
    // Fixed room for testing.
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
};

/** The main view lists roots only — a threaded reply appears as a count, never as its own row. */
export const Roots: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    await expect(canvas.queryByText(SEEDED.reply)).toBeNull();
    await expect(await canvas.findByText('1 reply')).toBeVisible();
  },
};

/**
 * A thread exists only where one was created: the declared root shows its summary row, the plain
 * message shows none and offers the create affordance instead.
 */
export const ThreadsAreCreated: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    // One declared thread in the fixture, so exactly one summary row — not one per message.
    await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(1);
    // And the undeclared message is the only one still offering to start one.
    await expect(await canvas.findAllByTestId('thread.message.start-thread')).toHaveLength(1);
  },
};

/** Delete is offered on the local identity's own message and withheld on everyone else's. */
export const DeleteOwnOnly: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    // Two roots render, only one of which the local identity authored — so only that one carries an
    // overflow menu holding edit and delete.
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
    await expect(await canvas.findAllByTestId('thread.message.more')).toHaveLength(1);

    // Deleting tombstones the feed item, so the message leaves the list — no "deleted" stub is
    // rendered because the feed query already excludes tombstoned items.
    await userEvent.click((await canvas.findAllByTestId('thread.message.more'))[0]);
    // The overflow menu is portaled out of the canvas, so its items resolve on the document.
    await userEvent.click(await screen.findByTestId('thread.message.delete'));
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
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    await expect((await canvas.findAllByTestId('thread.message.start-thread')).length).toBeGreaterThan(0);
    await expect(canvas.queryAllByTestId('thread.message.reply')).toHaveLength(0);
  },
};

/** Creating a thread declares its root, which is what makes the summary row appear. */
export const CreateThread: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(1);
    await userEvent.click((await canvas.findAllByTestId('thread.message.start-thread'))[0]);

    await waitFor(async () => {
      // The declaration lands in the feed, so both messages now carry a thread and neither offers to
      // start one.
      await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(2);
      await expect(canvas.queryAllByTestId('thread.message.start-thread')).toHaveLength(0);
    }, STORY_TIMEOUT);
  },
};

/**
 * Editing is a mode, not a button swap: the body takes an accented frame and states how to commit,
 * Enter saves, and Escape leaves the message as it was.
 */
export const EditMessage: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    // Edit is buried in the overflow menu, which is portaled out of the canvas.
    await userEvent.click((await canvas.findAllByTestId('thread.message.more'))[0]);
    await userEvent.click(await screen.findByTestId('thread.message.edit'));
    await expect(await canvas.findByTestId('thread.message.edit-hint')).toBeVisible();
    // The menu restores focus to its trigger as it unmounts, which would swallow the typing below.
    await waitFor(async () => {
      await expect(screen.queryByTestId('thread.message.edit')).toBeNull();
    });

    const editor = (await canvas.findByText(SEEDED.own))
      .closest('.cm-editor')
      ?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Message editor not found.');
    }

    await userEvent.click(editor);
    await userEvent.type(editor, 'Edited. ');
    // Sequential asserts so a failure names its step: the editor takes the text, then Enter commits it.
    await expect(messageTextContaining(canvasElement, SEEDED.own)).toContain('Edited.');
    await userEvent.keyboard('{Enter}');

    await waitFor(async () => {
      // Committing leaves edit mode, so the hint goes with it — and the edit survives into the rebuilt
      // read-only editor, which means it reached the message.
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
      await expect(messageTextContaining(canvasElement, SEEDED.own)).toContain('Edited.');
    }, STORY_TIMEOUT);
  },
};

/** Escape leaves edit mode without writing, so the body is unchanged. */
export const CancelEdit: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    await userEvent.click((await canvas.findAllByTestId('thread.message.more'))[0]);
    await userEvent.click(await screen.findByTestId('thread.message.edit'));
    await expect(await canvas.findByTestId('thread.message.edit-hint')).toBeVisible();
    await waitFor(async () => {
      await expect(screen.queryByTestId('thread.message.edit')).toBeNull();
    });

    const editor = (await canvas.findByText(SEEDED.own))
      .closest('.cm-editor')
      ?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Message editor not found.');
    }

    await userEvent.click(editor);
    await userEvent.type(editor, 'Discarded. ');
    await expect(messageTextContaining(canvasElement, SEEDED.own)).toContain('Discarded.');
    await userEvent.keyboard('{Escape}');

    await waitFor(async () => {
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
    }, STORY_TIMEOUT);
    // The editor is rebuilt from the message, so the discarded text is gone from it too.
    await expect(messageTextContaining(canvasElement, SEEDED.own)).not.toContain('Discarded.');
  },
};

/** Reacting to a message adds a chip showing the emoji and its count. */
export const React_: Story = {
  name: 'React',
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.own)).toBeVisible();
    }, STORY_TIMEOUT);

    await userEvent.click((await canvas.findAllByTestId('thread.message.react'))[0]);
    await userEvent.click((await screen.findAllByTestId('thread.message.reaction-option'))[0]);

    await waitFor(async () => {
      const chip = (await canvas.findAllByTestId('thread.message.reaction'))[0];
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
    }, STORY_TIMEOUT);
  },
};
