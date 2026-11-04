//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { coordinatesLine, googleLink, isPrecise, osmLink } from './osm.ts';

describe('osm', () => {
  const point = { lat: 52.1906, lng: 21.0129, precisionM: 250 };

  test('links out to OpenStreetMap and Google Maps at the point', ({ expect }) => {
    expect(osmLink(point)).toBe(
      'https://www.openstreetmap.org/?mlat=52.190600&mlon=21.012900#map=17/52.190600/21.012900',
    );
    expect(googleLink(point)).toBe('https://www.google.com/maps/search/?api=1&query=52.190600,21.012900');
  });

  test('says how precisely the point is placed', ({ expect }) => {
    expect(isPrecise(point)).toBe(false);
    expect(coordinatesLine(point)).toBe('52.19060, 21.01290 · placed to about 250 m');
    expect(coordinatesLine({ lat: 52.1906, lng: 21.0129, precisionM: 15 })).toBe('52.19060, 21.01290');
    expect(isPrecise({ lat: 1, lng: 2 })).toBe(true);
  });
});
