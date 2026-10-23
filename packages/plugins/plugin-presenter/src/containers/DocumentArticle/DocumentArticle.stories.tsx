//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { Filter } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory } from '@dxos/react-client/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';

import {
  ATTENDED_ID,
  presentationStoryDecorators,
  presentationStoryParameters,
} from '../../testing/presenterStory.tsx';
import { DocumentArticle } from './DocumentArticle.tsx';

const DECK = ['# One', '# Two\n\n<v-clicks>\n\n- alpha\n- beta\n\n</v-clicks>', '# Three'].join('\n\n---\n\n');

const DocumentStory = () => {
  const { space } = useClientStory();
  const [document] = useQuery(space?.db, Filter.type(Markdown.Document));
  const attributes = useAttentionAttributes(ATTENDED_ID);
  if (!document) {
    return <Loading />;
  }

  return (
    <div {...attributes} className='contents'>
      <DocumentArticle role='article' attendableId={ATTENDED_ID} subject={document} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/containers/DocumentArticle',
  render: DocumentStory,
  decorators: presentationStoryDecorators({
    onCreateSpace: async ({ space }) => {
      space.db.add(Markdown.make({ name: 'Deck', content: DECK }));
      await space.db.flush({ indexes: true });
    },
  }),
  parameters: presentationStoryParameters,
} satisfies Meta<typeof DocumentStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

/** The document's `---`-separated slides page and step in place; `f` requests presenting. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 3', undefined, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 3')).toBeVisible();
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('alpha')).toBeVisible();
    await expect(canvas.getByText('2 / 3')).toBeVisible();
    await userEvent.keyboard('f');
    // The overlay pager shows only on pointer movement, so fullscreen is read from the shell's fixed frame.
    await waitFor(() => expect(canvasElement.querySelector('.fixed.inset-0')).not.toBeNull());
  },
};
