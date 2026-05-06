//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Tag } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Subscription } from '#types';

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
  const { space } = useClientStory();
  const [post] = useQuery(space?.db, Filter.type(Subscription.Post));
  if (!post) {
    return <Loading />;
  }

  return <PostArticle role='article' subject={post} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-feed/containers/PostArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Subscription.Feed, Subscription.Post, Tag.Tag, Text.Text],
      onCreateSpace: async ({ space }) => {
        space.db.add(
          Subscription.makePost({
            title: 'Local-first software: a primer',
            link: 'https://www.inkandswitch.com/local-first/',
            author: 'Martin Kleppmann',
            published: new Date().toISOString(),
            guid: 'local-first-primer',
            content: SAMPLE_MARKDOWN,
            imageUrl: 'https://picsum.photos/seed/local-first/960/480',
          }),
        );
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
