//
// Copyright 2023 DXOS.org
//

// eslint-disable-next-line no-restricted-imports
import 'leaflet/dist/leaflet.css';
import { latLngBounds, type LatLngExpression } from 'leaflet';
import React, { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { type MapContainerProps } from 'react-leaflet/lib/MapContainer';
import { useResizeDetector } from 'react-resize-detector';

import { Globe, type GlobeControlsProps } from '@dxos/gem-globe';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type MapMarker } from '../../types';

// TODO(burdon): Needs to resize when sidebar opens/closes (if is open initially).
// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4

const defaults = {
  center: { lat: 51, lng: 0 } as LatLngExpression,
  zoom: 4,
};

//
// Root
//

type MapRootProps = ThemedClassName<MapContainerProps>;

const MapRoot = ({ classNames, center = defaults.center, zoom = defaults.zoom, ...props }: MapRootProps) => {
  // https://react-leaflet.js.org/docs/api-map
  return (
    <MapContainer
      className={mx('relative flex w-full h-full grow', classNames)}
      zoomControl={false}
      center={center}
      zoom={zoom}
      {...props}
    />
  );
};

//
// Control
//

type MapTilesProps = ThemedClassName<{
  markers?: MapMarker[];
}>;

const MapTiles = ({ markers = [] }: MapTilesProps) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 200 });
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
    // overwriting the user's zoom when it shouldn't.
  }, [markers]);

  return (
    <div ref={ref} className='flex w-full h-full overflow-hidden bg-base'>
      {/* Map tiles. */}
      <TileLayer
        className='dark:filter dark:grayscale dark:invert'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />
      {/* Markers. */}
      {/* TODO(burdon): Marker icon doesn't load on mobile? */}
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

//
// Controls
//

type MapControlsProps = GlobeControlsProps;

const MapControls = ({ classNames, ...props }: MapControlsProps) => {
  return <Globe.ZoomControl classNames={mx('z-[500] absolute bottom-4 left-4', classNames)} {...props} />;
};

export const Map = {
  Root: MapRoot,
  Tiles: MapTiles,
  Controls: MapControls,
};

export { type MapTilesProps, type MapControlsProps };
