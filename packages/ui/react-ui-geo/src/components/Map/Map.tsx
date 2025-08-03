//
// Copyright 2023 DXOS.org
//

import 'leaflet/dist/leaflet.css';

import L, { Control, type ControlPosition, DomEvent, DomUtil, type LatLngExpression, latLngBounds } from 'leaflet';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { MapContainerProps } from 'react-leaflet';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import { useResizeDetector } from 'react-resize-detector';

import { debounce } from '@dxos/async';
import { ThemeProvider, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { ActionControls, type ControlProps, ZoomControls, controlPositions } from '../Toolbar';
import { type MapCanvasProps } from '../types';

// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4
// TODO(burdon): react-leaflet v5 is not compatible with react 18.
// TODO(burdon): Guess initial location.

const defaults = {
  center: { lat: 51, lng: 0 } as L.LatLngExpression,
  zoom: 4,
};

//
// Root
//

type MapRootProps = ThemedClassName<MapContainerProps>;

/**
 * https://react-leaflet.js.org/docs/api-map
 */
const MapRoot = ({
  classNames,
  scrollWheelZoom = true,
  doubleClickZoom = true,
  touchZoom = true,
  center = defaults.center,
  zoom = defaults.zoom,
  ...props
}: MapRootProps) => {
  return (
    <MapContainer
      className={mx('relative grid bs-full is-full bg-baseSurface', classNames)}
      attributionControl={false}
      zoomControl={false}
      scrollWheelZoom={scrollWheelZoom}
      doubleClickZoom={doubleClickZoom}
      touchZoom={touchZoom}
      center={center}
      zoom={zoom}
      {...props}
    />
  );
};

//
// Controller
// TODO(burdon): Normalize with Globe.
//

type MapController = {
  setCenter: (center: LatLngExpression, zoom?: number) => void;
  setZoom: (cb: (zoom: number) => number) => void;
};

const MapCanvas = forwardRef<MapController, MapCanvasProps>(({ markers, center, zoom, onChange }, forwardedRef) => {
  const { ref, width, height } = useResizeDetector({ refreshRate: 200 });
  const map = useMap();

  useImperativeHandle(
    forwardedRef,
    () => ({
      setCenter: (center: LatLngExpression, zoom?: number) => {
        map.setView(center, zoom);
      },
      setZoom: (cb) => {
        map.setZoom(cb(map.getZoom()));
      },
    }),
    [map],
  );

  // Resize.
  useEffect(() => {
    if (width && height) {
      map.invalidateSize();
    }
  }, [width, height]);

  // Events.
  useEffect(() => {
    const handler = debounce(() => {
      onChange?.({
        center: map.getCenter(),
        zoom: map.getZoom(),
      });
    }, 100);

    map.on('move', handler);
    map.on('zoom', handler);
    map.on('focus', () => setHasFocus(true));
    map.on('blur', () => setHasFocus(false));
    return () => {
      map.off('move', handler);
      map.off('zoom', handler);
      map.off('focus');
      map.off('blur');
    };
  }, [map, onChange]);

  // Support zoom if focused.
  const [hasFocus, setHasFocus] = useState(false);
  useEffect(() => {
    if (hasFocus) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, hasFocus]);

  // Position.
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    } else if (zoom !== undefined) {
      map.setZoom(zoom);
    }
  }, [center, zoom]);

  // Set the viewport around the markers, or show the whole world map if `markers` is empty.
  useEffect(() => {
    if (markers.length > 0) {
      const bounds = latLngBounds(markers.map((marker) => marker.location));
      map.fitBounds(bounds);
    } else {
      map.setView(defaults.center, defaults.zoom);
    }
  }, [markers]);

  return (
    <div ref={ref} role='none' className='grid inset-0 overflow-hidden bg-baseSurface'>
      {/* Focus ring. */}
      <div
        className={mx(
          'z-[9999] absolute inset-0 border border-transparent pointer-events-none',
          hasFocus && 'border-primary-500 ',
        )}
      />

      {/* Map tiles. */}
      <TileLayer
        className='dark:filter dark:grayscale dark:invert'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
      />

      {/* Markers. */}
      {markers?.map(({ id, title, location: { lat, lng } }) => {
        return (
          <Marker
            key={id}
            position={{ lat, lng }}
            icon={
              // TODO(burdon): Create custom icon from bundled assets.
              new L.Icon({
                iconUrl: 'https://dxos.network/marker-icon.png',
                iconRetinaUrl: 'https://dxos.network/marker-icon-2x.png',
                shadowUrl: 'https://dxos.network/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              })
            }
          >
            {title && <Popup>{title}</Popup>}
          </Marker>
        );
      })}
    </div>
  );
});

//
// Controls
// Integrates with Leaflet custom controls.
//

const CustomControl = ({
  position,
  children,
}: PropsWithChildren<{
  position: ControlPosition;
}>) => {
  const map = useMap();

  useEffect(() => {
    const control = new Control({ position });
    control.onAdd = () => {
      const container = DomUtil.create('div', mx('!m-0', controlPositions[position]));
      DomEvent.disableClickPropagation(container);
      DomEvent.disableScrollPropagation(container);

      const root = createRoot(container);
      root.render(
        <ThemeProvider tx={defaultTx}>
          <Tooltip.Provider>{children}</Tooltip.Provider>
        </ThemeProvider>,
      );

      return container;
    };

    control.addTo(map);
    return () => {
      control.remove();
    };
  }, [map, position, children]);

  return null;
};

type MapControlProps = { position?: ControlPosition } & Pick<ControlProps, 'onAction'>;

//
// Map
//

export const Map = {
  Root: MapRoot,
  Canvas: MapCanvas,
  Zoom: ({ onAction, position = 'bottomleft', ...props }: MapControlProps) => (
    <CustomControl position={position} {...props}>
      <ZoomControls onAction={onAction} />
    </CustomControl>
  ),
  Action: ({ onAction, position = 'bottomright', ...props }: MapControlProps) => (
    <CustomControl position={position} {...props}>
      <ActionControls onAction={onAction} />
    </CustomControl>
  ),
};

export { type MapCanvasProps, type MapController };
