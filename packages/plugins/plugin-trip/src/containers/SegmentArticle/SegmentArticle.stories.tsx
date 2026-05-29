//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TripBuilder } from '#testing';
import { translations } from '#translations';

import { SegmentArticle } from './SegmentArticle';

type StoryProps = {
  /** Index of the segment to pre-select (0-based). */
  selectedIndex?: number;
};

const DefaultStory = ({ selectedIndex = 0 }: StoryProps) => {
  const { trip, segments } = useMemo(
    () =>
      new TripBuilder()
        .addFlight(0, { confirmed: true })
        .addHotel(1, 3)
        .addActivity(2)
        .addFlight(4)
        .build('London Trip'),
    [],
  );
  const segment = segments[selectedIndex];

  if (!segment) {
    return <div className='p-4 text-description'>Select a segment to view details.</div>;
  }
  return <SegmentArticle role='article' subject={segment} companionTo={trip} attendableId='story' />;
};

const meta = {
  title: 'plugins/plugin-trip/containers/SegmentArticle',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' }), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flight: Story = { args: { selectedIndex: 0 } };
export const Accommodation: Story = { args: { selectedIndex: 1 } };
export const Activity: Story = { args: { selectedIndex: 2 } };
export const Tentative: Story = { args: { selectedIndex: 3 } };
export const Empty: Story = { args: { selectedIndex: -1 } };
