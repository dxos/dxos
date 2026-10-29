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

import EFFECT_TALK from '../../../testing/2025-05-20-effect.md?raw';
import DXOS_DECK from '../../../testing/deck.md?raw';
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

const withDocument = (name: string, content: string) =>
  presentationStoryDecorators({
    onCreateSpace: async ({ space }) => {
      space.db.add(Markdown.make({ name, content }));
      await space.db.flush({ indexes: true });
    },
  });

const meta = {
  title: 'plugins/plugin-presenter/containers/DocumentArticle',
  render: DocumentStory,
  parameters: presentationStoryParameters,
} satisfies Meta<typeof DocumentStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

/** The document's `---`-separated slides page and step in place; `f` requests presenting. */
export const Default: Story = {
  decorators: withDocument('Deck', DECK),
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
    // The overlay pager mounts only in fullscreen (it fades, but stays in the DOM, while the pointer rests).
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
  },
};

const nextSlide = async (canvas: ReturnType<typeof within>, position: string) => {
  await userEvent.keyboard('{ArrowRight}');
  await expect(await canvas.findByText(position)).toBeVisible();
};

/** The DXOS deck: a video-backed opener, then the logotype slide. */
export const DXOSDeck: Story = {
  decorators: withDocument('DXOS', DXOS_DECK),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 11', undefined, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    const video = await waitFor(() => {
      const element = canvasElement.querySelector('[data-slide-background] video');
      if (!(element instanceof HTMLVideoElement)) {
        throw new Error('Missing background video');
      }
      return element;
    });
    await expect(video.getAttribute('src')).toBe('https://media.dxos.network/DXOS.mp4');
    await nextSlide(canvas, '2 / 11');
    // SlideFrame renders its slide only once it has measured itself, a frame after the page number changes.
    await waitFor(() => expect(canvasElement.querySelector('img[src$="dxos-logotype-blue.png"]')).not.toBeNull());
  },
};

/** The Effect talk: 17 slides, including a code slide. */
export const EffectTalk: Story = {
  decorators: withDocument('Effect', EFFECT_TALK),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 17', undefined, LOAD_TIMEOUT)).toBeVisible();
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    for (let slide = 2; slide <= 12; slide++) {
      await nextSlide(canvas, `${slide} / 17`);
    }
    await waitFor(() => expect(canvasElement.querySelector('[data-slide] pre')).not.toBeNull());
  },
};
