//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, screen, userEvent, waitFor, within } from 'storybook/test';

import { Filter } from '@dxos/echo';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { useQuery } from '@dxos/react-client/echo';
import { useClientStory } from '@dxos/react-client/testing';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading } from '@dxos/react-ui/testing';

import { Presentation } from '#types';

import {
  ATTENDED_ID,
  PresentationStory,
  presentationStoryDecorators,
  presentationStoryParameters,
} from '../../testing/presenterStory.tsx';
import { PresentationArticle } from './PresentationArticle.tsx';

const UnattendedStory = () => {
  const { space } = useClientStory();
  const [presentation] = useQuery(space?.db, Filter.type(Presentation.Presentation));
  const editorAttributes = useAttentionAttributes(ATTENDED_ID);
  const deckAttributes = useAttentionAttributes('deck');
  return (
    <div className='grid grid-cols-2 h-full'>
      <div {...editorAttributes} className='p-2'>
        <input data-testid='other-input' autoFocus />
      </div>
      <div {...deckAttributes} className='flex'>
        {presentation ? <PresentationArticle role='article' attendableId='deck' subject={presentation} /> : <Loading />}
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/containers/PresentationArticle',
  render: PresentationStory,
  decorators: presentationStoryDecorators({
    onCreateSpace: async ({ space }) => {
      const presentation = space.db.add(Presentation.make({ name: 'Demo', slides: ['# One', '# Two', '# Three'] }));
      Presentation.link(presentation, space.db.add(Markdown.make({ name: 'Notes', content: '# Notes' })));
      space.db.add(Markdown.make({ name: 'Appendix', content: '# Appendix' }));
      await space.db.flush({ indexes: true });
    },
  }),
  parameters: presentationStoryParameters,
} satisfies Meta<typeof PresentationStory>;

export default meta;

type Story = StoryObj<typeof meta>;

const LOAD_TIMEOUT = { timeout: 10_000 };

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT)).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Add slide' }));
    await expect(await canvas.findByText('1 / 5')).toBeVisible();
  },
};

/** Arrow keys turn the page on mount, with no click into the deck first. */
export const FocusOnMount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 4')).toBeVisible();
  },
};

/** The toolbar button enters fullscreen; ESC returns inline with the keys still live. */
export const Fullscreen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await userEvent.click(canvas.getByTestId('presenter.fullscreen'));
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('presenter.overlay')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await expect(await canvas.findByText('2 / 4')).toBeVisible();
  },
};

/** The section picker offers unlinked objects only, and links the one picked. */
export const LinkSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await userEvent.click(canvas.getByTestId('presenter.section-picker'));
    const option = await screen.findByRole('option', { name: /Appendix/ }, { timeout: 5_000 });
    await expect(screen.queryByRole('option', { name: /Notes/ })).toBeNull();
    await expect(screen.queryByRole('option', { name: /Demo/ })).toBeNull();
    await userEvent.click(option);
    await expect(await canvas.findByText('1 / 5')).toBeVisible();
  },
};

/** An unattended deck leaves the caret where it is, even once its slides load. */
export const Unattended: Story = {
  render: UnattendedStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('other-input');
    await waitFor(() => expect(input).toHaveFocus());
    await canvas.findByText('1 / 4', undefined, LOAD_TIMEOUT);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(input).toHaveFocus();
    await expect(canvas.getByTestId('presenter.deck')).not.toHaveFocus();
  },
};
