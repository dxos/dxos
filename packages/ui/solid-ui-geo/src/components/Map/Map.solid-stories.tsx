//
// Copyright 2024 DXOS.org
//

import { createSignal } from 'solid-js';
import { type Meta, type StoryObj } from 'storybook-solidjs-vite';

import { useMapZoomHandler } from '../../hooks';
import { type GeoMarker } from '../../types';

import { Map, type MapController } from './Map';

const DefaultStory = ({ markers = [] }: { markers?: GeoMarker[] }) => {
  const [controller, setController] = createSignal<MapController>();
  const handleZoomAction = useMapZoomHandler(controller());

  return (
    <Map.Root ref={setController}>
      <Map.Tiles />
      <Map.Markers markers={() => markers} />
      <Map.Zoom position='bottomleft' onAction={handleZoomAction} />
      <Map.Action position='bottomright' />
    </Map.Root>
  );
};

const meta = {
  title: 'ui/solid-ui-geo/Map',
  component: Map.Root as any,
  render: DefaultStory,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithMarkers: Story = {
  args: {
    markers: [
      { id: 'los angeles', title: 'Los Angeles', location: { lat: 34.0522, lng: -118.2437 } },
      { id: 'new york', title: 'New York', location: { lat: 40.7128, lng: -74.006 } },
      { id: 'warsaw', title: 'Warsaw', location: { lat: 52.2297, lng: 21.0122 } },
      { id: 'london', title: 'London', location: { lat: 51.5074, lng: -0.1278 } },
      { id: 'toronto', title: 'Toronto', location: { lat: 43.6532, lng: -79.3832 } },
      { id: 'seattle', title: 'Seattle', location: { lat: 47.6062, lng: -122.3321 } },
      { id: 'barcelona', title: 'Barcelona', location: { lat: 41.3851, lng: 2.1734 } },
      { id: 'tokyo', title: 'Tokyo', location: { lat: 35.6762, lng: 139.6503 } },
      { id: 'sydney', title: 'Sydney', location: { lat: -33.8688, lng: 151.2093 } },
      { id: 'auckland', title: 'Auckland', location: { lat: -36.8509, lng: 174.7645 } },
      { id: 'new-delhi', title: 'New Delhi', location: { lat: 28.6139, lng: 77.209 } },
      { id: 'manila', title: 'Manila', location: { lat: 14.5995, lng: 120.9842 } },
      { id: 'beijing', title: 'Beijing', location: { lat: 39.9042, lng: 116.4074 } },
      { id: 'seoul', title: 'Seoul', location: { lat: 37.5665, lng: 126.978 } },
      { id: 'bangkok', title: 'Bangkok', location: { lat: 13.7563, lng: 100.5018 } },
      { id: 'singapore', title: 'Singapore', location: { lat: 1.3521, lng: 103.8198 } },
      { id: 'kuala-lumpur', title: 'Kuala Lumpur', location: { lat: 3.139, lng: 101.6869 } },
      { id: 'jakarta', title: 'Jakarta', location: { lat: -6.2088, lng: 106.8456 } },
      { id: 'hanoi', title: 'Hanoi', location: { lat: 21.0285, lng: 105.8542 } },
      { id: 'phnom-penh', title: 'Phnom Penh', location: { lat: 11.5564, lng: 104.9282 } },
      { id: 'vientiane', title: 'Vientiane', location: { lat: 17.9757, lng: 102.6331 } },
      { id: 'yangon', title: 'Yangon', location: { lat: 16.8661, lng: 96.1951 } },
    ] as GeoMarker[],
  },
};
