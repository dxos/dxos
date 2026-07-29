//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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
    await expect((await canvas.findAllByText('Start a thread')).length).toBeGreaterThan(0);
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

    // Two roots render, only one of which the local identity authored.
    await expect(await canvas.findByText(SEEDED.other)).toBeVisible();
    await expect(await canvas.findAllByTestId('thread.message.delete')).toHaveLength(1);

    // Deleting tombstones the feed item, so the message leaves the list — no "deleted" stub is
    // rendered because the feed query already excludes tombstoned items.
    await userEvent.click((await canvas.findAllByTestId('thread.message.delete'))[0]);
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
    await userEvent.click((await canvas.findAllByTestId('thread.message.reaction-option'))[0]);

    await waitFor(async () => {
      const chip = (await canvas.findAllByTestId('thread.message.reaction'))[0];
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
    }, STORY_TIMEOUT);
  },
};
