//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Filter } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { useSpaces } from '@dxos/react-client/echo';
import { Dialog } from '@dxos/react-ui';
import { Loading, withLayout } from '@dxos/react-ui/testing';

import { generateMagazine } from '#testing';
import { translations } from '#translations';
import { Magazine, Subscription } from '#types';

import { FeedDialog } from './FeedDialog';

const DefaultStory = () => {
  const [space] = useSpaces();
  const magazines = useQuery(space?.db, Filter.type(Magazine.Magazine));
  const feeds = useQuery(space?.db, Filter.type(Subscription.Subscription));
  const magazine = magazines[0];
  const feed = feeds[0];

  return (
    <>
      {/* Readout so a play test can assert the cancel actually removed the feed, not just closed the dialog.
          Outside the loading guard: cancelling drops the feed, and the readout has to survive that. */}
      <div data-testid='counts'>{`feeds:${feeds.length} refs:${magazine?.feeds.length ?? 0}`}</div>
      {magazine && feed ? (
        <Dialog.Root defaultOpen>
          <Dialog.Overlay>
            <FeedDialog feed={feed} magazine={magazine} />
          </Dialog.Overlay>
        </Dialog.Root>
      ) : (
        <Loading />
      )}
    </>
  );
};

const meta = {
  title: 'plugins/plugin-magazine/containers/FeedDialog',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        ClientPlugin.make({
          types: [Subscription.Subscription, Subscription.Post, Magazine.Magazine],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { defaultSpace } = yield* initializeIdentity(client);
              // Mirrors what the toolbar does before opening the dialog: the feed is already in the
              // database and attached to the magazine, so the form edits a live object.
              const feed = defaultSpace.db.add(Subscription.makeSubscription({ type: 'rss' }));
              defaultSpace.db.add(generateMagazine({ name: 'Reading', feeds: [feed] }));
            }),
        }),
      ],
    }),
  ],
  tags: ['test'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The form writes straight through to the live subscription. */
export const Edit: Story = {
  play: async () => {
    const body = within(document.body);
    const url = await body.findByLabelText(/^url$/i, undefined, { timeout: 15_000 });
    await userEvent.clear(url);
    await userEvent.type(url, 'https://example.com/feed.xml');
    await waitFor(async () => {
      await expect((url as HTMLInputElement).value).toBe('https://example.com/feed.xml');
    });
    await expect(await body.findByText('OK')).toBeInTheDocument();
    await expect(await body.findByText('Cancel')).toBeInTheDocument();
  },
};

export const Cancelled: Story = {
  play: async () => {
    const body = within(document.body);
    // The seed lands asynchronously, so wait for it rather than reading the first render.
    await waitFor(
      async () => {
        await expect(await body.findByTestId('counts')).toHaveTextContent('feeds:1 refs:1');
      },
      { timeout: 15_000 },
    );

    const cancel = await body.findByText('Cancel', undefined, { timeout: 15_000 });
    await userEvent.click(cancel);
    // Unmounting is the cancel: the subscription is removed and its ref taken off the magazine.
    await waitFor(
      async () => {
        await expect(await body.findByTestId('counts')).toHaveTextContent('feeds:0 refs:0');
      },
      { timeout: 5000 },
    );
  },
};
