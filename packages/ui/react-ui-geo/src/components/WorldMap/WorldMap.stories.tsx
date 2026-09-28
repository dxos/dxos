//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Button } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { timezones } from '../../data.ts';
import { type GeoMarker } from '../../types.ts';
import { WorldMap, type WorldMapProps } from './WorldMap.tsx';

const ZONES = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const markers: GeoMarker[] = ZONES.map((zone) => ({ id: zone, title: zone, location: timezones[zone] }));

type StoryArgs = Pick<WorldMapProps, 'view'>;

const DefaultStory = ({ view }: StoryArgs) => {
  const [selected, setSelected] = useState<string>();
  return (
    <div className='flex flex-col h-full'>
      <div className='dx-grow'>
        <WorldMap markers={markers} selected={selected} view={view} />
      </div>
      <div className='flex flex-wrap gap-2 p-2'>
        {markers.map((marker) => (
          <Button
            key={marker.id}
            data-testid='worldMap.marker'
            variant={marker.id === selected ? 'primary' : 'default'}
            onClick={() => setSelected(marker.id)}
          >
            {marker.title}
          </Button>
        ))}
      </div>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-geo/WorldMap',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  argTypes: {
    view: { control: 'inline-radio', options: ['map', 'globe'] },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { view: 'map' },
};

export const Globe: Story = {
  args: { view: 'globe' },
};
