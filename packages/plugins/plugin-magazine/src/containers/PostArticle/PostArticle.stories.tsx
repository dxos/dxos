//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Filter, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Subscription } from '#types';

import { MagazinePlugin } from '../../MagazinePlugin';
import { PostArticle } from './PostArticle';

const SAMPLE_MARKDOWN = `# Local-first software

> "You own your data, in spite of the cloud." — Ink & Switch

Local-first apps put the user's data on their own device, syncing through a
decentralized substrate rather than a central server. That shift unlocks several
properties that cloud apps struggle to deliver:

## Why it matters

- **No spinners.** Reads and writes hit local storage, so latency is sub-millisecond.
- **Offline by default.** The network is an enhancement, not a requirement.
- **Longevity.** Your data survives the vendor — no lock-in, no shutdown risk.

## A small example

\`\`\`ts
const space = await client.spaces.create();
const note = space.db.add(Obj.make(Note, { title: 'Hello' }));
\`\`\`

See the [original essay](https://www.inkandswitch.com/local-first/) for the full
list of seven ideals, including real-time collaboration and end-to-end privacy.
`;

const DefaultStory = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const posts = useQuery(space?.db, Filter.type(Subscription.Post));
  const post = posts[0];
  if (!post) {
    return <Loading />;
  }

  return <PostArticle role='article' subject={post} attendableId='story' />;
};

// `PostArticle` calls `useOperationInvoker` (for the star/archive/mark-unread toolbar actions), so
// the story must render under a plugin manager that provides the OperationInvoker capability — a
// bare `withClientProvider` throws "Missing PluginManagerContext".
const seedSpace = ({ client }: { client: Client }) =>
  Effect.gen(function* () {
    yield* initializeIdentity(client);
    const space = (yield* Effect.promise(() => client.spaces.create())) as Space;
    yield* Effect.promise(() => space.waitUntilReady());

    // Content/imageUrl no longer live on the Post object — they belong on
    // `Subscription.contentFeed` / `Subscription.postState`. PostContent falls
    // back to `description` when no fetched body is available, so the sample
    // markdown is stashed there for the story.
    space.db.add(
      Subscription.makePost({
        title: 'Local-first software: a primer',
        link: 'https://www.inkandswitch.com/local-first/',
        author: 'Martin Kleppmann',
        published: new Date().toISOString(),
        guid: 'local-first-primer',
        description: SAMPLE_MARKDOWN,
      }),
    );
    yield* Effect.promise(() => space.db.flush());
  });

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-magazine/containers/PostArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Subscription.Subscription, Subscription.Post, Tag.Tag, Text.Text],
          onClientInitialized: seedSpace,
        }),
        SpacePlugin({}),
        StorybookPlugin({}),
        MagazinePlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
