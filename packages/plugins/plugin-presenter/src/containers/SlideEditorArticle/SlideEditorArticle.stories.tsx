//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter, Ref } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';

import { translations } from '#translations';
import { Presentation } from '#types';

import { SlideEditorArticle } from './SlideEditorArticle.tsx';

const DefaultStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const texts = useQuery(space?.db, Filter.type(Text.Text));
  const first = presentation?.sections[0];
  const slide = first && texts.find((text) => Ref.hasEntityId(text.id)(first));
  if (!slide) {
    return <Loading />;
  }

  return <SlideEditorArticle role='article' attendableId='story' subject={slide} />;
};

const meta = {
  title: 'plugins/plugin-presenter/containers/SlideEditorArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Text.Text, Markdown.Document],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        // The first slide starts empty so typing produces exactly the heading under test.
        const presentation = space.db.add(Presentation.make({ name: 'Demo', slides: ['', '# Two', '# Three'] }));
        Presentation.link(presentation, space.db.add(Markdown.make({ name: 'Notes', content: '# Notes' })));
        await space.db.flush({ indexes: true });
      },
    }),
    withPluginManager({ plugins: [] }),
    // Outermost, so the plugin manager's atom registry is not replaced by the decorator's own.
    withAttention(),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Typing in the editor re-renders the slide preview beside it. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', undefined, { timeout: 10_000 });
    await userEvent.click(editor);
    await userEvent.keyboard('# Hello');
    const preview = within(canvas.getByTestId('presenter.slide-editor.preview'));
    await expect(await preview.findByRole('heading', { name: 'Hello' })).toBeVisible();
  },
};
