//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Database, Feed, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { CallsPlugin } from '@dxos/plugin-calls/plugin';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Channel, Message, Reaction, Thread } from '@dxos/types';

import { translations } from '#translations';

import { ThreadPlugin } from '../../ThreadPlugin';
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
  decorators: [
    withMosaic(),
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      capabilities: [
        Capability.contributes(AppCapabilities.Schema, [
          Channel.Channel,
          Feed.Feed,
          Thread.Thread,
          Message.Message,
          Reaction.Reaction,
        ]),
      ],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Channel.Channel, Feed.Feed, Thread.Thread, Message.Message, Reaction.Reaction],
          config: new Config({
            runtime: {
              services: {
                edge: {
                  url: 'https://edge.dxos.workers.dev/',
                },
                iceProviders: [
                  {
                    urls: 'https://edge.dxos.workers.dev/ice',
                  },
                ],
              },
            },
          }),
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const channel = personalSpace.db.add(Channel.make({ name: 'general' }));
              yield* Effect.promise(() => channel.backend.config.load());
              const feed = Channel.getFeed(channel);
              invariant(feed, 'Channel is not feed-backed');
              // Two roots; the second already carries a thread, so the main view exercises both the
              // "start a thread" and the "N replies" states of the affordance. Only `first` is
              // attributed to the local identity, which is what the author-gated delete asserts on.
              const first = Message.make({
                sender: { identityDid: client.halo.identity.get()?.did },
                blocks: [{ _tag: 'text', text: 'Hello, channel.' }],
              });
              const second = Message.make({
                sender: { role: 'user' },
                blocks: [{ _tag: 'text', text: 'Messages are stored in the feed.' }],
              });
              const reply = Message.make({
                sender: { role: 'user' },
                blocks: [{ _tag: 'text', text: 'And replies live in a thread.' }],
                threadId: second.id,
              });
              yield* Feed.append(feed, [first, second, reply]).pipe(Effect.provide(Database.layer(personalSpace.db)));
            }),
        }),
        SpacePlugin({}),
        ThreadPlugin(),
        CallsPlugin(),
      ],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ChannelArticle>;

export default meta;

type Story = StoryObj<typeof meta>;

// Identity creation and space initialization run well past testing-library's 1s default.
const TIMEOUT = { timeout: 15_000 };

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
      await expect(await canvas.findByText('Hello, channel.')).toBeVisible();
    }, TIMEOUT);

    await expect(canvas.queryByText('And replies live in a thread.')).toBeNull();
    await expect(await canvas.findByText('1 reply')).toBeVisible();
    await expect((await canvas.findAllByText('Start a thread')).length).toBeGreaterThan(0);
  },
};

/** Opening a thread reveals its replies in the panel beside the channel; closing hides them again. */
export const OpenThread: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const open = await waitFor(() => canvas.findByText('1 reply'), TIMEOUT);
    await userEvent.click(open);

    const panel = within(await canvas.findByTestId('thread.panel'));
    await expect(await panel.findByText('And replies live in a thread.')).toBeVisible();

    await userEvent.click(await canvas.findByTestId('thread.panel.close'));
    await waitFor(async () => {
      await expect(canvas.queryByTestId('thread.panel')).toBeNull();
    });
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
      await expect(await canvas.findByText('Hello, channel.')).toBeVisible();
    }, TIMEOUT);

    // Two roots render, only one of which the local identity authored.
    await expect(await canvas.findByText('Messages are stored in the feed.')).toBeVisible();
    await expect(await canvas.findAllByTestId('thread.message.delete')).toHaveLength(1);

    // Deleting tombstones the feed item, so the message leaves the list — no "deleted" stub is
    // rendered because the feed query already excludes tombstoned items.
    await userEvent.click((await canvas.findAllByTestId('thread.message.delete'))[0]);
    await waitFor(async () => {
      await expect(canvas.queryByText('Hello, channel.')).toBeNull();
    }, TIMEOUT);
    await expect(await canvas.findByText('Messages are stored in the feed.')).toBeVisible();
  },
};

/** A reply posted from the thread panel joins that thread, not the main channel view. */
export const ReplyInThread: Story = {
  args: {
    subject: undefined,
    attendableId: 'story',
    role: AppSurface.Article.role,
    roomId: '04a1d1911703b8e929d0649021a965',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const open = await waitFor(() => canvas.findByText('1 reply'), TIMEOUT);
    await userEvent.click(open);

    const panelElement = await canvas.findByTestId('thread.panel');
    const panel = within(panelElement);

    // The thread composer is a CodeMirror editor; locate it via its placeholder.
    const placeholder = await panel.findByText(/reply in thread/i, {}, TIMEOUT);
    const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
    if (!editor) {
      throw new Error('Thread composer not found.');
    }

    await userEvent.click(editor);
    await userEvent.type(editor, 'Posted into the thread.');
    await userEvent.keyboard('{Enter}');

    await waitFor(async () => {
      await expect(await panel.findByText('Posted into the thread.')).toBeVisible();
      // The reply count grows, and the reply never appears as a root in the main list.
      await expect(await canvas.findByText('2 replies')).toBeVisible();
    }, TIMEOUT);
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
      await expect(await canvas.findByText('Hello, channel.')).toBeVisible();
    }, TIMEOUT);

    await userEvent.click((await canvas.findAllByTestId('thread.message.react'))[0]);
    await userEvent.click((await canvas.findAllByTestId('thread.message.reaction-option'))[0]);

    await waitFor(async () => {
      const chip = (await canvas.findAllByTestId('thread.message.reaction'))[0];
      await expect(chip).toBeVisible();
      await expect(chip).toHaveAttribute('aria-pressed', 'true');
    }, TIMEOUT);
  },
};
