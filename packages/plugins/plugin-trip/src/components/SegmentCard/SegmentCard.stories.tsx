//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TripBuilder } from '#testing';
import { translations } from '#translations';

import { type SegmentCardAction, type SegmentCardActionHandler, SegmentTile } from './SegmentCard';

const buildSegments = () =>
  new TripBuilder()
    .addFlight(0, { confirmed: true })
    .addHotel(1, 3)
    .addActivity(2)
    .addFlight(4) // tentative
    .build('London Trip').segments;

type StoryArgs = {
  /** Index of the segment to render (0=flight, 1=accommodation, 2=activity, 3=tentative flight). */
  segmentIndex: number;
  /** Render the tile in its "current" (focused) state. */
  current?: boolean;
};

const DefaultStory = ({ segmentIndex, current }: StoryArgs) => {
  const segments = useMemo(() => buildSegments(), []);
  const segment = segments[segmentIndex];
  if (!segment) {
    return null;
  }
  const handleAction: SegmentCardActionHandler = (action: SegmentCardAction) => {
    // eslint-disable-next-line no-console
    console.log('SegmentCard action', action);
  };
  return (
    <div className='w-[28rem] border border-subdued-separator'>
      <Focus.Group asChild>
        <Mosaic.Container withFocus currentId={current ? segment.id : undefined}>
          <SegmentTile data={{ segment, onAction: handleAction }} location='story' current={current} />
        </Mosaic.Container>
      </Focus.Group>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-trip/components/SegmentCard',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flight: Story = { args: { segmentIndex: 0 } };
export const Accommodation: Story = { args: { segmentIndex: 1 } };
export const Activity: Story = { args: { segmentIndex: 2 } };
export const Tentative: Story = { args: { segmentIndex: 3 } };
export const Current: Story = { args: { segmentIndex: 0, current: true } };
