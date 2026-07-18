//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { Blog } from '#types';

import { PublicationArticle } from './PublicationArticle';

const POST_COUNT = 3;

/** Builds a `Publication` with a handful of posts, each with a name and description. */
const makeStoryPublication = (): Blog.Publication => {
  const publication = Blog.makePublication({ name: 'Story Publication' });
  for (let i = 0; i < POST_COUNT; i++) {
    const post = Blog.makePost({
      name: `Post ${i + 1}`,
      description: `Summary for post ${i + 1}.`,
    });
    Obj.update(publication, (publication) => {
      publication.posts = [...(publication.posts ?? []), Ref.make(post)];
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
      capabilities: [Capability.contributes(AppCapabilities.Translations, translations)],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Blog.Publication, Blog.Post, Markdown.Document],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        MarkdownPlugin(),
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

    // Instructions view replaces the gallery entirely — no more Masonry tiles.
    await waitFor(() => expect(canvas.queryAllByRole('listitem')).toHaveLength(0), { timeout: 10_000 });
  },
};
