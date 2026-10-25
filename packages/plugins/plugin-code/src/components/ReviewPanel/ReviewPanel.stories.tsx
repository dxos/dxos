//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withMosaic } from '@dxos/react-ui-mosaic/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import FILE_SYSTEM_REVIEW from '../../../../plugin-file-system/PLUGIN.review.mdl?raw';
import { parseReview } from '../SpecModel/index.ts';
import { ReviewPanel, type ReviewPanelProps } from './ReviewPanel.tsx';

/** The plugin-file-system review the spec-review skill wrote, with verdicts across every status. */
const REVIEW = parseReview(FILE_SYSTEM_REVIEW);

/** Holds the current verdict the way the spec page does, so selection round-trips through the host. */
const ControlledPanel = (props: ReviewPanelProps) => {
  const [selected, setSelected] = useState<string>();
  return <ReviewPanel {...props} selected={selected} onSelect={setSelected} />;
};

const meta = {
  title: 'plugins/plugin-code/components/ReviewPanel',
  component: ReviewPanel,
  render: (args) => <ControlledPanel {...args} />,
  decorators: [
    withMosaic(),
    withTheme(),
    withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' }),
  ],
  parameters: { translations: [...translations, ...reactUiTranslations] },
} satisfies Meta<typeof ReviewPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Every verdict as a card in the list container, worst first; clicking a card makes it current. */
export const Default: Story = {
  args: { review: REVIEW, onOpenCode: () => {} },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const cards = await waitFor(() => canvas.getAllByTestId('verdict-card'));
    await expect(cards).toHaveLength(REVIEW.verdicts.length);
    await expect(cards[0].dataset.status).toBe('missing');
    await userEvent.click(cards[2]);
    // Re-queried after the click, since selection re-renders the tiles; the `dx-current` class is on every tile.
    await waitFor(() => expect(canvas.getAllByTestId('verdict-card')[2].getAttribute('aria-current')).toBe('true'));
    await expect(canvas.getAllByTestId('verdict-card')[0].getAttribute('aria-current')).toBeNull();
  },
};

/** A spec with no review yet: where the skill writes one. */
export const NoReview: Story = {
  args: { reviewKey: 'github:dxos/dxos/packages/plugins/plugin-x/PLUGIN.review.mdl' },
};
