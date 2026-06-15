//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo } from 'react';

import { Focus, Mosaic } from '@dxos/react-ui-mosaic';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TripBuilder } from '#testing';
import { translations } from '#translations';

import { type SegmentCardAction, type SegmentCardActionHandler, SegmentTile } from './SegmentCard';
import { FlightEditableCard } from './SegmentEditableCard';

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
    <Mosaic.Root>
      <Focus.Group asChild>
        <Mosaic.Container withFocus currentId={current ? segment.id : undefined}>
          <SegmentTile data={{ segment, onAction: handleAction }} location='story' current={current} />
        </Mosaic.Container>
      </Focus.Group>
    </Mosaic.Root>
  );
};

const meta = {
  title: 'plugins/plugin-trip/components/SegmentCard',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(min-card-width)' })],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flight: Story = {
  args: {
    segmentIndex: 0,
  },
};

export const FlightEditable: StoryObj = {
  render: () => {
    const segments = useMemo(() => buildSegments(), []);
    const segment = segments[3];
    const handleAction: SegmentCardActionHandler = useCallback((action: SegmentCardAction) => {
      // eslint-disable-next-line no-console
      console.log(action);
    }, []);

    return <FlightEditableCard segment={segment} onAction={handleAction} />;
  },
};

export const Accommodation: Story = {
  args: {
    segmentIndex: 1,
  },
};

export const Activity: Story = {
  args: {
    segmentIndex: 2,
  },
};

export const Tentative: Story = {
  args: {
    segmentIndex: 3,
  },
};

export const Current: Story = {
  args: {
    segmentIndex: 0,
    current: true,
  },
};
