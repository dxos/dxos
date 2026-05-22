//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useMemo } from 'react';

import { withClientProvider } from '@dxos/react-client/testing';
import { SelectionManager, SelectionProvider } from '@dxos/react-ui-attention';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TripBuilder } from '#testing';
import { translations } from '#translations';

import { SegmentArticle } from './SegmentArticle';

type StoryProps = {
  /** Index of the segment to pre-select (0-based). */
  selectedIndex?: number;
};

const ATTENDABLE_ID = 'story-trip';

const DefaultStory = ({ selectedIndex = 0 }: StoryProps) => {
  const registry = useContext(RegistryContext);
  const { trip } = useMemo(
    () =>
      new TripBuilder()
        .addFlight(0, { confirmed: true })
        .addHotel(1, 3)
        .addActivity(2)
        .addFlight(4)
        .build('London Trip'),
    [],
  );
  const segmentId = trip.segments?.[selectedIndex]?.id;

  const selection = useMemo(() => {
    return new SelectionManager(registry, {
      [ATTENDABLE_ID]: { mode: 'single', id: segmentId },
    });
  }, [registry, segmentId]);

  return (
    <SelectionProvider selection={selection}>
      <SegmentArticle role='article' attendableId={ATTENDABLE_ID} companionTo={trip} />
    </SelectionProvider>
  );
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
export const Lodging: Story = { args: { selectedIndex: 1 } };
export const Activity: Story = { args: { selectedIndex: 2 } };
export const Tentative: Story = { args: { selectedIndex: 3 } };
