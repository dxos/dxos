//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, within } from 'storybook/test';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { Markdown } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { BloggerOperationHandlerSet } from '#operations';
import { translations } from '#translations';
import { Blog } from '#types';

import { PostArticle } from './PostArticle';

/** Builds a `Post` whose single body document is seeded with recognizable text for the assertion. */
const makeStoryPost = (): Blog.Post => {
  const post = Blog.makePost({ name: 'My Post' });
  const document = post.content.target;
  invariant(document);
  const text = document.content.target;
  invariant(text);
  Obj.update(text, (text) => {
    text.content = 'Post body.';
  });
  return post;
};

// The ECHO `Post` (and its body document) are built inside the render function (never at module
// scope) so each story mount gets its own object instances.
const DefaultStory = () => {
  const post = useMemo(() => makeStoryPost(), []);
  return <PostArticle role='article' attendableId='story' subject={post} />;
};

const meta = {
  title: 'plugins/plugin-blogger/containers/PostArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      capabilities: [
        Capability.provide(AppCapabilities.Translations, translations),
        Capability.provide(Capabilities.OperationHandler, BloggerOperationHandlerSet),
      ],
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

/** The post form (name) and the single body editor render, showing the seeded body text. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The client/space take a moment to initialize (identity creation, etc.), well past
    // testing-library's default 1s `findBy*` timeout — mirrors the explicit timeouts other
    // ECHO-backed stories use (e.g. plugin-kanban/KanbanArticle.stories.tsx).
    void expect(await canvas.findByText('Post body.', undefined, { timeout: 10_000 })).toBeVisible();
  },
};
