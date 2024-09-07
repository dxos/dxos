//
// Copyright 2023 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { latLngBounds, type LatLngExpression } from 'leaflet';
import React, { type FC, useEffect } from 'react';
import { Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useResizeDetector } from 'react-resize-detector';

import { type MapMarker } from '../types';

// TODO(burdon): Needs to resize when sidebar opens/closes (if is open initially).
// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4

const defaults = {
  center: { lat: 37.970833, lng: 23.72611 } as LatLngExpression,
  zoom: 1,
};

/**
 * https://www.latlong.net
 * https://react-leaflet.js.org/docs/api-map
 */
export const MapControl: FC<{ markers?: MapMarker[] }> = ({ markers = [] }) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 100 });
  const map = useMap();

  useEffect(() => {
    if (width && height) {
      map.invalidateSize();
    }
  }, [width, height]);

  // Set the viewport around the markers, or show the whole world map if `markers` is empty.
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = latLngBounds(markers.map((marker) => marker.location));
      map.fitBounds(bounds);
    } else {
      map.setView(defaults.center, defaults.zoom);
    }
    // Using plain `[markers]` here causes the effect to trigger extraneously,
    // overwriting the user's zoom when it shouldn't:
  }, [markers]);

  return (
    <div ref={ref} className='flex w-full h-full'>
      {/* Map tiles. */}
      <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />

      {/* Markers. */}
      {/* TODO(burdon): Marker icon doesn't load on mobile. */}
      {markers.map(({ id, title, location: { lat, lng } }) => {
        return (
          <Marker key={id} position={{ lat, lng }}>
            {title && <Popup>{title}</Popup>}
          </Marker>
        );
      })}
    </div>
  );
};
