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

    // Clicking the selected card again clears the selection.
    await userEvent.click(title());
    await waitFor(async () => expect(card(canvasElement, 'tokens').dataset.relation).toBeUndefined());
  },
};

/** A map opened on a selected feature, as a link from a task would open it. */
export const Selected: Story = {
  args: { selectedId: 'triage' },
};
