//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { locationOf } from '../../model/location.ts';
import { addressOf } from '../../model/results.ts';
import { odynca, pulawska } from '../../testing/geo-areas-fixture.ts';
import { LocationPopover, MiniMap } from './LocationPopover.tsx';

const pinned = { ...locationOf(pulawska)!, address: addressOf(pulawska) };
const ringed = { ...locationOf(odynca)!, address: addressOf(odynca) };

const DefaultStory = () => (
  <div className='flex flex-col gap-4 text-sm'>
    <LocationPopover point={pinned} address={pinned.address}>
      {pinned.address}
    </LocationPopover>
    <LocationPopover point={ringed} address={ringed.address}>
      {ringed.address}
    </LocationPopover>
  </div>
);

const meta = {
  title: 'plugins/plugin-lighthouse/components/LocationPopover',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered', classNames: 'w-[20rem]' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Hover or focus a row: a pinned building, and a street-level point with its precision ring. */
export const Default: Story = {};

/** The popover's map on its own, with the precision ring. */
export const Mini: Story = {
  render: () => (
    <div className='w-[300px] border border-separator rounded-md overflow-hidden'>
      <MiniMap point={ringed} label={ringed.address} />
    </div>
  ),
};

/** Focusing a row opens the popover with the map and links out; Escape closes it. */
export const FocusAndEscape: Story = {
  play: async ({ canvasElement }) => {
    const [row] = within(canvasElement).getAllByTestId('lighthouse.card.location');
    row?.focus();
    const popover = await waitFor(() => within(document.body).getByTestId('lighthouse.geo.popover'), { timeout: 3000 });
    await expect(within(popover).getByTestId('lighthouse.geo.osm')).toHaveAttribute(
      'href',
      expect.stringContaining('openstreetmap.org/?mlat=52.190600'),
    );
    await expect(popover.querySelector('.leaflet-control-attribution')?.textContent).toContain('OpenStreetMap');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(document.body).queryByTestId('lighthouse.geo.popover')).toBeNull());
  },
};
