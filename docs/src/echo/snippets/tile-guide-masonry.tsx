//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Masonry } from '@dxos/react-ui-masonry';
import * as Card from '@dxos/react-ui/Card';

// #region gallery
type Photo = {
  id: string;
  title: string;
  color: string;
  height: number;
  caption?: string;
};

const PHOTOS: Photo[] = [
  {
    id: '1',
    title: 'Harbor',
    color: '#0891b2',
    height: 80,
    caption: 'Boats at first light.',
  },
  { id: '2', title: 'Dunes', color: '#ca8a04', height: 48 },
  {
    id: '3',
    title: 'Forest',
    color: '#059669',
    height: 104,
    caption: 'A path through the pines, after rain.',
  },
  { id: '4', title: 'Peaks', color: '#4f46e5', height: 64 },
  {
    id: '5',
    title: 'Market',
    color: '#e11d48',
    height: 88,
    caption: 'Saturday stalls.',
  },
  { id: '6', title: 'Canyon', color: '#ea580c', height: 56 },
  {
    id: '7',
    title: 'Lagoon',
    color: '#2563eb',
    height: 72,
    caption: 'Still water, no wind.',
  },
  { id: '8', title: 'Meadow', color: '#65a30d', height: 60 },
  {
    id: '9',
    title: 'Glacier',
    color: '#0ea5e9',
    height: 120,
    caption: 'Blue ice under a grey sky.',
  },
  { id: '10', title: 'Orchard', color: '#16a34a', height: 52 },
  {
    id: '11',
    title: 'Lighthouse',
    color: '#dc2626',
    height: 96,
    caption: 'The lamp turns at dusk.',
  },
  { id: '12', title: 'Desert', color: '#d97706', height: 68 },
  {
    id: '13',
    title: 'Bridge',
    color: '#7c3aed',
    height: 84,
    caption: 'Fog over the river.',
  },
  { id: '14', title: 'Reef', color: '#0d9488', height: 44 },
  {
    id: '15',
    title: 'Vineyard',
    color: '#9333ea',
    height: 112,
    caption: 'Rows down to the lake.',
  },
  { id: '16', title: 'Tundra', color: '#64748b', height: 58 },
];

/** A tile draws one item; the masonry measures each tile and places it in the shortest column. */
const PhotoTile = ({ data: photo }: { data: Photo }) => (
  <Card.Root>
    <div style={{ height: photo.height, background: photo.color }} />
    <Card.Header>
      <Card.Title>{photo.title}</Card.Title>
    </Card.Header>
    {photo.caption && (
      <Card.Row classNames='pb-2'>
        <Card.Text variant='muted' lines={2}>
          {photo.caption}
        </Card.Text>
      </Card.Row>
    )}
  </Card.Root>
);

/** Tiles of different heights packed into columns; the number of columns follows the width, at least 9rem each. */
export const PhotoGallery = () => (
  <Masonry.Root Tile={PhotoTile} minColumnWidth={9}>
    <Masonry.Content>
      <Masonry.Viewport items={PHOTOS} getId={(photo) => photo.id} />
    </Masonry.Content>
  </Masonry.Root>
);
// #endregion
