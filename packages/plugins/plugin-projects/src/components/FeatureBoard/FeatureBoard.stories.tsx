//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { SAMPLE_FEATURES } from '../FeatureCard/testing.ts';
import { FeatureBoard, type FeatureBoardProps } from './FeatureBoard.tsx';

const meta: Meta<FeatureBoardProps> = {
  title: 'plugins/plugin-projects/components/FeatureBoard',
  render: (args) => <FeatureBoard {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { features: SAMPLE_FEATURES },
};

export default meta;

type Story = StoryObj<typeof meta>;

const card = (canvasElement: HTMLElement, id: string) => {
  const element = canvasElement.querySelector<HTMLElement>(`[data-feature="${id}"]`);
  if (!element) {
    throw new Error(`no card for ${id}`);
  }
  return element;
};

/** Cards in map order under a count per status. Click a card to see what it needs and what needs it. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    // The name also labels dependency rows on other cards, so click the card's own title.
    const title = () => within(card(canvasElement, 'sync')).getByRole('heading', { name: 'Provider sync' });
    await waitFor(async () => expect(title()).toBeInTheDocument());
    await userEvent.click(title());
    await waitFor(async () => expect(card(canvasElement, 'tokens').dataset.relation).toBe('dependency'));
    await expect(card(canvasElement, 'compose').dataset.relation).toBe('dependent');
    await expect(card(canvasElement, 'delegate').dataset.relation).toBe('dependent');
    await expect(card(canvasElement, 'feature-map').dataset.relation).toBeUndefined();

    // Selection follows the arrow keys, as in any single-select list; from the first card, there is always one below.
    const tile = (id: string) => card(canvasElement, id).closest('[role="option"]');
    await expect(tile('sync')).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(within(card(canvasElement, 'accounts')).getByRole('heading', { name: 'Accounts' }));
    await waitFor(async () => expect(tile('accounts')).toHaveAttribute('aria-selected', 'true'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(async () => expect(tile('accounts')).toHaveAttribute('aria-selected', 'false'));
    await expect(canvasElement.querySelectorAll('[role="option"][aria-selected="true"]')).toHaveLength(1);

    // Escape clears it.
    await userEvent.keyboard('{Escape}');
    await waitFor(async () =>
      expect(canvasElement.querySelectorAll('[role="option"][aria-selected="true"]')).toHaveLength(0),
    );
  },
};

/** A map opened on a selected feature, as a link from a task would open it; another card can then be selected. */
export const Selected: Story = {
  args: { defaultSelectedId: 'triage' },
  play: async ({ canvasElement }) => {
    const tile = (id: string) => card(canvasElement, id).closest('[role="option"]');
    await waitFor(async () => expect(tile('triage')).toHaveAttribute('aria-selected', 'true'));
    // Masonry reveals the tiles once measured; until then they are hidden from the accessibility tree.
    const title = await within(card(canvasElement, 'sync')).findByRole('heading', { name: 'Provider sync' });
    await userEvent.click(title);
    await waitFor(async () => expect(tile('sync')).toHaveAttribute('aria-selected', 'true'));
    await expect(tile('triage')).toHaveAttribute('aria-selected', 'false');
  },
};
