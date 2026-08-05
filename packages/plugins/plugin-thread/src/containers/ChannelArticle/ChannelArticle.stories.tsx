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

import { SEEDED, STORY_TIMEOUT, channelStoryDecorators, tileFor } from '../testing';
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

/** Waits for the seeded conversation to render, which needs an identity and a space first. */
const ready = async (canvasElement: HTMLElement): Promise<void> => {
  await waitFor(async () => {
    await expect(within(canvasElement).queryByText(SEEDED.own)).not.toBeNull();
  }, STORY_TIMEOUT);
};

/**
 * Rendered text of the message editor holding `substring`. Read from the editor rather than by
 * `findByText`, which cannot match an edited line: CodeMirror splits it across several nodes, and the
 * caret sits wherever the click left it, so the insertion point is not part of what is asserted.
 */
const messageTextContaining = (canvasElement: HTMLElement, substring: string): string | undefined =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-content'))
    .map((element) => element.textContent ?? '')
    .find((text) => text.includes(substring));

/**
 * Opens a message's overflow menu — where edit and delete live — and picks an item. Menu content is
 * portaled to the body, so items resolve on the document rather than in the canvas.
 */
const openOverflow = async (canvasElement: HTMLElement, text: string, testId: string): Promise<void> => {
  const tile = await tileFor(canvasElement, text);
  await userEvent.click(await within(tile).findByTestId('thread.message.more'));
  await userEvent.click(await screen.findByTestId(testId));
  // The menu restores focus to its trigger as it unmounts, which would swallow anything typed next.
  await waitFor(async () => {
    await expect(screen.queryByTestId(testId)).toBeNull();
  });
};

export const Default: Story = { args: ARGS };

/**
 * What the channel shows and offers, and what creating a thread changes about it.
 *
 * One play rather than a story apiece: these are steps in one session, and each story costs an
 * identity and a space to boot. The mutation comes last, so the reads above it see the fixture.
 */
export const Reading: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    // Thread-first: the list is roots only, so a threaded reply appears as a count, never as a row.
    await expect(canvas.queryByText(SEEDED.reply)).toBeNull();
    await expect(await canvas.findByText('1 reply')).toBeVisible();
    // One thread in the fixture, so exactly one summary row — not one per message.
    await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(1);

    // The channel offers "start a thread" and withholds reply; inside a thread it is the other way
    // round (see the ChannelThreadArticle stories). That asymmetry is what pushes conversation into
    // threads rather than growing the channel. The slot reflects each message's state: start on the
    // plain ones, view where a thread exists.
    await expect(await canvas.findAllByTestId('thread.message.start-thread')).toHaveLength(2);
    await expect(await canvas.findAllByTestId('thread.message.view-thread')).toHaveLength(1);
    await expect(canvas.queryAllByTestId('thread.message.reply')).toHaveLength(0);

    // Only the local identity's messages carry an overflow menu, since edit and delete are all it
    // holds; the fixture has two own roots and one from someone else.
    await expect(await canvas.findAllByTestId('thread.message.more')).toHaveLength(2);
    await expect(within(await tileFor(canvasElement, SEEDED.other)).queryByTestId('thread.message.more')).toBeNull();

    // Creating a thread declares its root, which is what makes the summary row appear — and turns
    // that message's start affordance into "view thread" rather than removing it.
    const own = await tileFor(canvasElement, SEEDED.own);
    await userEvent.click(await within(own).findByTestId('thread.message.start-thread'));
    await waitFor(async () => {
      await expect(await canvas.findAllByTestId('thread.message.open-thread')).toHaveLength(2);
      await expect(await canvas.findAllByTestId('thread.message.view-thread')).toHaveLength(2);
      await expect(await canvas.findAllByTestId('thread.message.start-thread')).toHaveLength(1);
    }, STORY_TIMEOUT);
  },
};

/**
 * Editing is a mode, not a button swap: the body takes an accented frame and states how to commit.
 * Enter writes the edit back to the message; Escape throws the draft away.
 */
export const Editing: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    await openOverflow(canvasElement, SEEDED.own, 'thread.message.edit');
    await expect(await canvas.findByTestId('thread.message.edit-hint')).toBeVisible();

    const editor = (await canvas.findByText(SEEDED.own))
      .closest('.cm-editor')
      ?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Message editor not found.');
    }
    await userEvent.click(editor);
    await userEvent.type(editor, 'Edited. ');
    // Sequential asserts so a failure names its step: the editor takes the text, then Enter commits.
    await expect(messageTextContaining(canvasElement, SEEDED.own)).toContain('Edited.');
    await userEvent.keyboard('{Enter}');
    await waitFor(async () => {
      // Committing leaves edit mode, so the hint goes with it — and the edit survives into the
      // rebuilt read-only editor, which means it reached the message.
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
      await expect(messageTextContaining(canvasElement, SEEDED.own)).toContain('Edited.');
    }, STORY_TIMEOUT);

    // Escape leaves edit mode without writing, so the body is unchanged.
    await openOverflow(canvasElement, SEEDED.ownFollowUp, 'thread.message.edit');
    const second = (await canvas.findByText(SEEDED.ownFollowUp))
      .closest('.cm-editor')
      ?.querySelector<HTMLElement>('.cm-content');
    if (!second) {
      throw new Error('Message editor not found.');
    }
    await userEvent.click(second);
    await userEvent.type(second, 'Discarded. ');
    await expect(messageTextContaining(canvasElement, SEEDED.ownFollowUp)).toContain('Discarded.');
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(canvas.queryByTestId('thread.message.edit-hint')).toBeNull();
    }, STORY_TIMEOUT);
    await expect(messageTextContaining(canvasElement, SEEDED.ownFollowUp)).not.toContain('Discarded.');
  },
};

/**
 * Reacting from the toolbar, and the pill landing on the message that was reacted to.
 *
 * The fixture's first two messages share a sender and so render as one run under a single avatar —
 * reacting to the second must not credit the one that heads the run.
 */
export const Reacting: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    await ready(canvasElement);

    // Three inline options on the message itself, no menu to open first — and each row of a run has
    // its own, even though the run shares one avatar.
    const second = await tileFor(canvasElement, SEEDED.ownFollowUp);
    const options = await within(second).findAllByTestId('thread.message.reaction-option');
    await expect(options).toHaveLength(3);
    await userEvent.click(options[0]);

    // The pill lands on the message that was reacted to, not on the one that heads the group.
    await waitFor(async () => {
      const pill = (
        await within(await tileFor(canvasElement, SEEDED.ownFollowUp)).findAllByTestId('thread.message.reaction')
      )[0];
      await expect(pill).toBeVisible();
      await expect(pill).toHaveAttribute('aria-pressed', 'true');
    }, STORY_TIMEOUT);
    const first = await tileFor(canvasElement, SEEDED.own);
    await expect(within(first).queryAllByTestId('thread.message.reaction')).toHaveLength(0);

    // Anything outside the inline set comes from the full emoji picker. Only the popover is asserted:
    // emoji-mart renders its grid inside a shadow root, so a play cannot reach an emoji to click.
    await userEvent.click(await within(first).findByTestId('thread.message.react'));
    const picker = await screen.findByTestId('thread.message.reaction-picker', {}, STORY_TIMEOUT);
    await expect(picker.querySelector('em-emoji-picker')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    await waitFor(async () => {
      await expect(screen.queryByTestId('thread.message.reaction-picker')).toBeNull();
    }, STORY_TIMEOUT);
  },
};

/**
 * Deleting tombstones the feed item, so the message leaves the list — no "deleted" stub is rendered,
 * because the feed query already excludes tombstoned items.
 */
export const Deleting: Story = {
  args: ARGS,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await ready(canvasElement);

    await openOverflow(canvasElement, SEEDED.own, 'thread.message.delete');
    await waitFor(async () => {
      await expect(canvas.queryByText(SEEDED.own)).toBeNull();
    }, STORY_TIMEOUT);
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
  },
};
