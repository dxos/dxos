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

const tile = (canvas: ReturnType<typeof within>, index: number) =>
  canvas.findByTestId(`presenter.slide-grid.${index}`, undefined, LOAD_TIMEOUT);

/** Every slide is a thumbnail; the toolbar's add button and the ghost tile after the last slide each add a tile. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tile(canvas, 3);
    await expect(canvas.queryByTestId('presenter.slide-grid.4')).toBeNull();
    await userEvent.click(canvas.getByTestId('presenter.add-slide'));
    await tile(canvas, 4);
    await userEvent.click(canvas.getByTestId('presenter.slide-grid.add'));
    await tile(canvas, 5);
  },
};

/** Each tile names its slide's graph node, so the app's context menu (plugin-navtree) shows that node's actions. */
export const SlideMenu: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = await tile(canvas, 0);
    await waitFor(() => expect(first.getAttribute('data-dx-context')).toMatch(/\/[^/]+$/));
    const ids = [0, 1, 2, 3].map((index) =>
      canvas.getByTestId(`presenter.slide-grid.${index}`).getAttribute('data-dx-context'),
    );
    await expect(new Set(ids).size).toBe(4);
  },
};

/** Arrow keys move the current slide on mount, with no click into the grid first. */
export const FocusOnMount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await tile(canvas, 0)).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(async () => expect(await tile(canvas, 1)).toHaveAttribute('aria-selected', 'true'));
  },
};

/** The toolbar button presents fullscreen; ESC returns to the grid with the keys still live. */
export const Fullscreen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tile(canvas, 3);
    await userEvent.click(canvas.getByTestId('presenter.play'));
    await expect(await canvas.findByTestId('presenter.overlay')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(canvas.queryByTestId('presenter.overlay')).toBeNull());
    await waitFor(() => expect(canvas.getByTestId('presenter.deck')).toHaveFocus());
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(async () => expect(await tile(canvas, 1)).toHaveAttribute('aria-selected', 'true'));
  },
};

/** The fullscreen pager ends with an exit button, which returns to the grid. */
export const ExitButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tile(canvas, 3);
    await userEvent.click(canvas.getByTestId('presenter.play'));
    await userEvent.click(await canvas.findByTestId('presenter.pager.exit'));
    await waitFor(() => expect(canvas.queryByTestId('presenter.overlay')).toBeNull());
    await tile(canvas, 0);
  },
};

/** Double-clicking a thumbnail opens that slide rather than presenting it. */
export const OpenFromTile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.dblClick(await tile(canvas, 2));
    await waitFor(async () => expect(await tile(canvas, 2)).toHaveAttribute('aria-selected', 'true'));
    await expect(canvas.queryByTestId('presenter.overlay')).toBeNull();
  },
};

/** The section picker offers unlinked objects only, and links the one picked. */
export const LinkSection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await tile(canvas, 3);
    await userEvent.click(canvas.getByTestId('presenter.section-picker'));
    const option = await screen.findByRole('option', { name: /Appendix/ }, { timeout: 5_000 });
    // Scoped to the picker, since the grid's thumbnails are options too.
    const picker = within(option.closest<HTMLElement>('[role="listbox"]') ?? document.body);
    await expect(picker.queryByRole('option', { name: /Notes/ })).toBeNull();
    await expect(picker.queryByRole('option', { name: /Demo/ })).toBeNull();
    await userEvent.click(option);
    await tile(canvas, 4);
  },
};

/** An unattended deck leaves the caret where it is, even once its slides load. */
export const Unattended: Story = {
  render: UnattendedStory,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByTestId('other-input');
    await waitFor(() => expect(input).toHaveFocus());
    await tile(canvas, 3);
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(input).toHaveFocus();
    await expect(canvas.getByTestId('presenter.deck')).not.toHaveFocus();
  },
};
