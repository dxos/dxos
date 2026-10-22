//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import * as ProcessManagerPlugin from '@dxos/app-framework/ProcessManagerPlugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Filter } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';
import { Text } from '@dxos/schema';

import { createDemoPresentation, createPresenterStoryPlugin } from '#testing';
import { translations } from '#translations';
import { Presentation } from '#types';

import { PresentationArticle } from './PresentationArticle.tsx';

const ATTENDED_ID = 'story';

const DemoStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const attributes = useAttentionAttributes(ATTENDED_ID);
  if (!presentation) {
    return <Loading />;
  }

  return (
    <div {...attributes} className='contents'>
      <PresentationArticle role='article' attendableId={ATTENDED_ID} subject={presentation} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/Demo',
  render: DemoStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Presentation.Presentation, Text.Text, Markdown.Document],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        createDemoPresentation(space.db);
        await space.db.flush({ indexes: true });
      },
    }),
    withPluginManager({
      plugins: [ProcessManagerPlugin.make(), createPresenterStoryPlugin({ slideSurface: true })()],
    }),
    withAttention(ATTENDED_ID),
  ],
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...reactUiTranslations, ...formTranslations],
  },
} satisfies Meta<typeof DemoStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Steps through the owned slides to the first linked document. */
export const Demo: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 9', undefined, { timeout: 10_000 })).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight>7/}');
    await expect(await canvas.findByText('8 / 9')).toBeVisible();
    await expect(await canvas.findByRole('heading', { name: 'Linked document' }, { timeout: 5_000 })).toBeVisible();
  },
};
