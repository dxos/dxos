//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { FeatureMap, type FeatureMapProps } from './FeatureMap.tsx';
import { SAMPLE_FEATURES } from './testing.ts';

const meta: Meta<FeatureMapProps> = {
  title: 'plugins/plugin-projects/components/FeatureMap',
  render: (args) => <FeatureMap {...args} />,
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

/** One column per spec. Click a card to see what it needs and what needs it, across plugins. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText('Provider sync'));
    await waitFor(async () =>
      expect(card(canvasElement, 'org.dxos.plugin.connector#F-2').dataset.relation).toBe('dependency'),
    );
    await expect(card(canvasElement, 'org.dxos.plugin.inbox#F-4').dataset.relation).toBe('dependent');
    await expect(card(canvasElement, 'org.dxos.product.composer#F-1').dataset.relation).toBe('dependent');
    await expect(card(canvasElement, 'org.dxos.plugin.projects#F-5').dataset.relation).toBeUndefined();

    // Clicking the selected card again clears the selection.
    await userEvent.click(canvas.getByText('Provider sync'));
    await waitFor(async () =>
      expect(card(canvasElement, 'org.dxos.plugin.connector#F-2').dataset.relation).toBeUndefined(),
    );
  },
};

/** A map opened on a selected feature, as a link from a task would open it. */
export const Selected: Story = {
  args: { selectedId: 'org.dxos.plugin.inbox#F-9' },
};
