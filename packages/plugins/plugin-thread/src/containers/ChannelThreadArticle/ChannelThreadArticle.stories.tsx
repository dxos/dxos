//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading } from '@dxos/react-ui/testing';
import { Channel } from '@dxos/types';

import { useThreads } from '#hooks';
import { translations } from '#translations';

import { SEEDED, STORY_TIMEOUT, channelStoryDecorators, tileFor } from '../testing';
import { ChannelThreadArticle } from './ChannelThreadArticle';

/** Opens the seeded fixture's only thread, so the story needs no id wired in from args. */
const DefaultStory = () => {
  const [space] = useSpaces();
  const [channel] = useQuery(space?.db, Query.type(Channel.Channel));
  const [thread] = useThreads(channel);
  if (!channel || !thread) {
    return <Loading data={{ channel, thread }} />;
  }

  return <ChannelThreadArticle subject={thread} channel={channel} role='article' />;
};

const meta = {
  title: 'plugins/plugin-thread/containers/ChannelThreadArticle',
  render: DefaultStory,
  decorators: channelStoryDecorators,
  parameters: {
    translations,
  },
  // Typed off the render, not the component: the story resolves the fixture's thread itself, so
  // there is no subject to pass through args.
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * The thread plank leads with its root message so the branch point stays visible, and offers reply
 * where the channel offers start-a-thread — the mirror that keeps threads one level deep.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
    }, STORY_TIMEOUT);

    await expect(await canvas.findByText(SEEDED.reply)).toBeVisible();
    // Roots of other threads stay in the channel view.
    await expect(canvas.queryByText(SEEDED.own)).toBeNull();

    // Inside a thread every message offers reply and none offers start-a-thread. Presence, not
    // visibility: the controls sit at visibility:hidden until the row is hovered.
    const reply = await tileFor(canvasElement, SEEDED.reply);
    await expect(await within(reply).findAllByTestId('thread.message.reply')).toHaveLength(1);
    await expect(canvas.queryAllByTestId('thread.message.start-thread')).toHaveLength(0);
  },
};

/**
 * Posting into the thread, plain and as a quote-reply: replying banners the target, and the sent
 * message renders with its quote once the ref resolves.
 */
export const Replying: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await waitFor(async () => {
      await expect(await canvas.findByText(SEEDED.reply)).toBeVisible();
    }, STORY_TIMEOUT);

    // The thread composer is a CodeMirror editor; locate it via its placeholder.
    const composer = async (): Promise<HTMLElement> => {
      const placeholder = await canvas.findByText(/reply in thread/i, {}, STORY_TIMEOUT);
      const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
      if (!editor) {
        throw new Error('Thread composer not found.');
      }

      return editor;
    };

    await userEvent.click(await composer());
    await userEvent.type(await composer(), 'Posted into the thread.');
    await userEvent.keyboard('{Enter}');
    await expect(await canvas.findByText('Posted into the thread.', {}, STORY_TIMEOUT)).toBeVisible();

    const target = await tileFor(canvasElement, SEEDED.reply);
    await userEvent.click(await within(target).findByTestId('thread.message.reply'));
    await expect(await canvas.findByTestId('thread.reply-banner')).toBeVisible();

    await userEvent.click(await composer());
    await userEvent.type(await composer(), 'Answering that specific point.');
    await userEvent.keyboard('{Enter}');

    // Sequential asserts so a failure names its step: send lands, banner clears, quote resolves.
    await expect(await canvas.findByText('Answering that specific point.', {}, STORY_TIMEOUT)).toBeVisible();
    await waitFor(async () => {
      await expect(canvas.queryByTestId('thread.reply-banner')).toBeNull();
    });
    await waitFor(async () => {
      // The quote resolves through `parentMessage` (reactively, via useObject).
      await expect(canvasElement.querySelectorAll('[data-testid="thread.message.quote"]').length).toBeGreaterThan(0);
    }, STORY_TIMEOUT);
  },
};
