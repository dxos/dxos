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
    // The thread slot reflects each message's state: view on the declared one, start on the other two.
    await expect(await canvas.findAllByTestId('thread.message.view-thread')).toHaveLength(1);
    await expect(await canvas.findAllByTestId('thread.message.start-thread')).toHaveLength(2);
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

    // Three roots render, two of which the local identity authored — so only those carry an overflow
    // menu holding edit and delete.
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
    await expect(await canvas.findAllByTestId('thread.message.more')).toHaveLength(2);

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

/**
 * Creating a thread declares its root, which is what makes the summary row appear — and turns that
 * message's start affordance into "view thread" rather than removing it.
 */
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
      // The declaration lands in the feed, so that message now carries a thread too: its summary row
      // appears and its slot turns from start into view.
      await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(2);
      await expect(await canvas.findAllByTestId('thread.message.view-thread')).toHaveLength(2);
      await expect(await canvas.findAllByTestId('thread.message.start-thread')).toHaveLength(1);
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

/**
 * Every message in a group carries its own controls — the fixture's first two messages share a sender
 * and so render as one run under a single avatar, and reacting to the second must land on the second.
 */
export const GroupedMessageControls: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.ownFollowUp)).toBeVisible();
    }, STORY_TIMEOUT);

    const tileFor = async (text: string): Promise<HTMLElement> => {
      const tile = (await canvas.findByText(text)).closest('[data-testid="thread.message"]');
      if (!(tile instanceof HTMLElement)) {
        throw new Error(`No tile for: ${text}`);
      }
      return tile;
    };

    // The run shares one avatar, yet each row has its own reaction options and overflow menu.
    const second = await tileFor(SEEDED.ownFollowUp);
    await expect(await within(second).findAllByTestId('thread.message.reaction-option')).toHaveLength(3);
    await expect(await within(second).findAllByTestId('thread.message.more')).toHaveLength(1);

    await userEvent.click((await within(second).findAllByTestId('thread.message.reaction-option'))[0]);

    // The pill lands on the message that was reacted to, not on the one that heads the group.
    await waitFor(async () => {
      await expect(
        await within(await tileFor(SEEDED.ownFollowUp)).findAllByTestId('thread.message.reaction'),
      ).toHaveLength(1);
    }, STORY_TIMEOUT);
    await expect(within(await tileFor(SEEDED.own)).queryAllByTestId('thread.message.reaction')).toHaveLength(0);
  },
};

/** The first few reactions sit inline in the toolbar; clicking one adds a pill with its count. */
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

    // Three inline options on the message itself, no menu to open first. Scoped to one tile because
    // the composer is a message tile too, and it carries no controls.
    const tile = (await canvas.findByText(SEEDED.own)).closest('[data-testid="thread.message"]');
    if (!(tile instanceof HTMLElement)) {
      throw new Error('Message tile not found.');
    }
    const options = await within(tile).findAllByTestId('thread.message.reaction-option');
    await expect(options).toHaveLength(3);
    await userEvent.click(options[0]);

    await waitFor(async () => {
      const pill = (await canvas.findAllByTestId('thread.message.reaction'))[0];
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
