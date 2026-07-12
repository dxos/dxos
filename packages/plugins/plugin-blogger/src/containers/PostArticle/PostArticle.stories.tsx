//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Capabilities, Capability } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown/types';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { BloggerOperationHandlerSet } from '#operations';
import { translations } from '#translations';
import { Blogger } from '#types';

import { PostArticle } from './PostArticle';

/**
 * Builds a `Post` with two drafts, each with distinct body text so a content-swap assertion is
 * meaningful: the one `makePost` creates (re-seeded with "First draft body."), plus a second
 * ("Second draft body.") appended after it.
 */
const makeStoryPost = (): Blogger.Post => {
  const post = Blogger.makePost({ name: 'My Post' });
  const [draftRef] = post.drafts ?? [];
  invariant(draftRef);
  const draft1 = draftRef.target!;
  Obj.update(draft1.content.target!.content.target!, (text) => {
    text.content = 'First draft body.';
  });

  const draft2 = Blogger.makeDraft({ label: 'Draft 2', content: 'Second draft body.' });
  Obj.update(post, (post) => {
    post.drafts = [...(post.drafts ?? []), Ref.make(draft2)];
  });
  Obj.setParent(draft2, post);
  return post;
};

// The ECHO `Post` (and its drafts) are built inside the render function (never at module scope) so
// each story mount gets its own object instances.
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
      // Contributes the real `BloggerOperationHandlerSet` (not a mock) so the toolbar's "+" add-draft
      // action resolves `BloggerOperation.AddDraft` through a real `OperationInvoker` — mirrors
      // plugin-sheet/SheetArticle.stories.tsx's inline `Capabilities.OperationHandler` contribution.
      capabilities: [
        Capability.contributes(AppCapabilities.Translations, translations),
        Capability.contributes(Capabilities.OperationHandler, BloggerOperationHandlerSet),
      ],
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Blogger.Publication, Blogger.Post, Blogger.Draft, Markdown.Document],
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

/**
 * Two draft tabs render; the toolbar defaults to the last draft; clicking the other tab switches
 * the active tab (and, with it, which draft's editor Surface is shown below, confirmed by the
 * distinct body text each draft was seeded with). No `PublisherService` is contributed, so
 * Publish/Import stay disabled. Clicking "+" appends a third draft tab and selects it.
 */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The client/space take a moment to initialize (identity creation, etc.), well past
    // testing-library's default 1s `findBy*` timeout — mirrors the explicit timeouts other
    // ECHO-backed stories use (e.g. plugin-kanban/KanbanArticle.stories.tsx).
    const draft0 = await canvas.findByTestId('post.toolbar.draft-0', undefined, { timeout: 10_000 });
    const draft1 = await canvas.findByTestId('post.toolbar.draft-1', undefined, { timeout: 10_000 });

    // The drafts toggle group renders as a Radix `radiogroup`; the active tab is `aria-checked`.
    // Defaults to the last draft, whose editor Surface shows its own body text.
    await waitFor(() => expect(draft1.getAttribute('aria-checked')).toBe('true'));
    void expect(draft0.getAttribute('aria-checked')).toBe('false');
    void expect(await canvas.findByText('Second draft body.', undefined, { timeout: 10_000 })).toBeVisible();
    void expect(canvas.queryByText('First draft body.')).not.toBeInTheDocument();

    await userEvent.click(draft0);
    await waitFor(() => expect(draft0.getAttribute('aria-checked')).toBe('true'));
    void expect(draft1.getAttribute('aria-checked')).toBe('false');

    // Switching to draft 0 swaps the editor Surface's content to draft 0's body text.
    void expect(await canvas.findByText('First draft body.', undefined, { timeout: 10_000 })).toBeVisible();
    void expect(canvas.queryByText('Second draft body.')).not.toBeInTheDocument();

    // No PublisherService is contributed in this story, so both stay disabled.
    void expect(await canvas.findByTestId('post.toolbar.publish')).toBeDisabled();
    void expect(await canvas.findByTestId('post.toolbar.import')).toBeDisabled();

    // Clicking "+" invokes `BloggerOperation.AddDraft` (via the real handler set contributed above)
    // and appends + selects a third draft tab.
    const addDraft = await canvas.findByTestId('post.toolbar.addDraft', undefined, { timeout: 10_000 });
    await userEvent.click(addDraft);
    const draft2 = await canvas.findByTestId('post.toolbar.draft-2', undefined, { timeout: 10_000 });
    await waitFor(() => expect(draft2.getAttribute('aria-checked')).toBe('true'), { timeout: 10_000 });
    void expect(draft0.getAttribute('aria-checked')).toBe('false');
  },
};
