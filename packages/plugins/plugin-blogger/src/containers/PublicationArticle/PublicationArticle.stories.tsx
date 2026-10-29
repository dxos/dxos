//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import * as CorePlugins from '@dxos/plugin-testing/CorePlugins';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Blog } from '#types';

import { PublicationArticle } from './PublicationArticle.tsx';

const POST_COUNT = 32;

const TOPICS = [
  'Local-first software',
  'Why our sync engine finally stopped losing edits after we rewrote conflict resolution from scratch',
  'Designing for offline',
  'CRDTs in practice',
  'A field guide to schema migrations',
  'Notes from the team offsite',
  'Shipping smaller pull requests',
  'What we learned running a public beta for six months with no marketing budget',
];

const SUMMARIES = [
  'A short take.',
  'How a small change in the data model removed an entire class of bugs, and what it cost us along the way.',
  'Lessons, mistakes and a few charts.',
  'We compare three approaches, measure each against real workloads, and explain why we picked the boring one. Includes the benchmarks, the trade-offs we accepted, and the open questions we still have.',
];

/** Builds a `Publication` with enough posts to scroll, varying title and summary lengths so tiles reflow. */
const makeStoryPublication = (): Blog.Publication => {
  const publication = Blog.makePublication({ name: 'Story Publication' });
  for (let index = 0; index < POST_COUNT; index++) {
    const topic = TOPICS[index % TOPICS.length];
    const part = Math.floor(index / TOPICS.length);
    const post = Blog.makePost({
      name: part === 0 ? topic : `${topic} (part ${part + 1})`,
      // Every fifth post has no summary, as a fresh draft would.
      description: index % 5 === 4 ? undefined : SUMMARIES[(index * 3) % SUMMARIES.length],
    });
    Obj.update(publication, (publication) => {
      publication.posts ??= [];
      publication.posts.push(Ref.make(post));
    });
  }

  return publication;
};

// The ECHO `Publication` (and its posts) are built inside the render function (never at module
// scope) so each story mount gets its own object instances.
const DefaultStory = () => {
  const publication = useMemo(() => makeStoryPublication(), []);
  return <PublicationArticle role='article' attendableId='story' subject={publication} />;
};

const meta = {
  title: 'plugins/plugin-blogger/containers/PublicationArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [Capability.contribute(AppCapabilities.Translations, translations)],
      plugins: [
        ...CorePlugins.make(),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
        ClientPlugin.make({
          types: [Blog.Publication, Blog.Post, Markdown.Document],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        MarkdownPlugin.make(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Default gallery view: a Masonry grid of `PostCard` tiles. */
export const Default: Story = {};

/** Clicking the toolbar toggle swaps the gallery for the instructions markdown editor. */
export const Instructions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Gallery view renders each post as a Masonry `listitem` tile.
    await waitFor(() => expect(canvas.getAllByRole('listitem').length).toBeGreaterThan(0), { timeout: 10_000 });

    const toggle = await canvas.findByTestId('publication.toolbar.toggleView', undefined, { timeout: 10_000 });
    await userEvent.click(toggle);

    // Instructions view replaces the gallery entirely - no more Masonry tiles.
    await waitFor(() => expect(canvas.queryAllByRole('listitem')).toHaveLength(0), { timeout: 10_000 });
  },
};
