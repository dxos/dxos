//
// Copyright 2023 DXOS.org
//

import 'leaflet/dist/leaflet.css';

import { createContext } from '@radix-ui/react-context';
import L, { Control, type ControlPosition, DomEvent, DomUtil, type LatLngLiteral, latLngBounds } from 'leaflet';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MapContainer, type MapContainerProps, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { ThemeProvider, type ThemedClassName, Tooltip } from '@dxos/react-ui';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { type GeoMarker } from '../../types';
import { ActionControls, type ControlProps, ZoomControls, controlPositions } from '../Toolbar';

// TODO(burdon): Explore plugins: https://www.npmjs.com/search?q=keywords%3Areact-leaflet-v4
// TODO(burdon): react-leaflet v5 is not compatible with react 18.
// TODO(burdon): Guess initial location.

const defaults = {
  center: { lat: 51, lng: 0 } as L.LatLngLiteral,
  zoom: 4,
} as const;

//
// Controller
//

type MapController = {
  setCenter: (center: LatLngLiteral, zoom?: number) => void;
  setZoom: (cb: (zoom: number) => number) => void;
};

//
// Context
//

type MapContextValue = {
  attention?: boolean;
  onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
};

const [MapContextProvier, useMapContext] = createContext<MapContextValue>('Map');

//
// Root
//

type MapRootProps = ThemedClassName<MapContainerProps & Pick<MapContextValue, 'onChange'>>;

/**
 * https://react-leaflet.js.org/docs/api-map
 */
const MapRoot = forwardRef<MapController, MapRootProps>(
  (
    { classNames, scrollWheelZoom = true, doubleClickZoom = true, touchZoom = true, center, zoom, onChange, ...props },
    forwardedRef,
  ) => {
    const [attention, setAttention] = useState(false);
    const mapRef = useRef<L.Map>(null);
    const map = mapRef.current;

    useImperativeHandle(
      forwardedRef,
      () => ({
        setCenter: (center: LatLngLiteral, zoom?: number) => {
          mapRef.current?.setView(center, zoom);
        },
        setZoom: (cb: (zoom: number) => number) => {
          mapRef.current?.setZoom(cb(mapRef.current?.getZoom() ?? 0));
        },
      }),
      [],
    );

    // Enable/disable scroll wheel zoom.
    // TODO(burdon): Use attention:
    // const {hasAttention} = useAttention(props.id);
    useEffect(() => {
      if (!map) {
        return;
      }

      if (attention) {
        map.scrollWheelZoom.enable();
      } else {
        map.scrollWheelZoom.disable();
      }
    }, [map, attention]);

    return (
      <MapContextProvier attention={attention} onChange={onChange}>
        <MapContainer
          {...props}
          ref={mapRef}
          className={mx('group relative grid bs-full is-full !bg-baseSurface dx-focus-ring-inset', classNames)}
          attributionControl={false}
          zoomControl={false}
          scrollWheelZoom={scrollWheelZoom}
          doubleClickZoom={doubleClickZoom}
          touchZoom={touchZoom}
          center={center ?? defaults.center}
          zoom={zoom ?? defaults.zoom}
          // whenReady={() => {}}
        />
      </MapContextProvier>
    );
  },
);

MapRoot.displayName = 'Map.Root';

//
// Tiles
// https://react-leaflet.js.org/docs/api-components/#tilelayer
//

type MapTilesProps = {};

const MapTiles = (_props: MapTilesProps) => {
  const ref = useRef<L.TileLayer>(null);
  const { onChange } = useMapContext(MapTiles.displayName);

  useMapEvents({
    zoomstart: (ev) => {
      onChange?.({
        center: ev.target.getCenter(),
        zoom: ev.target.getZoom(),
      });
    },
  });

  // NOTE: Need to dynamically update data attribute since TileLayer doesn't update, but
  // Tailwind requires setting the property for static analysis.
  const { attention } = useMapContext(MapTiles.displayName);
  useEffect(() => {
    if (ref.current) {
      ref.current.getContainer().dataset.attention = attention ? '1' : '0';
    }
  }, [attention]);

  // TODO(burdon): Option to add class 'invert'.
  return (
    <>
      <TileLayer
        ref={ref}
        data-attention={attention}
        detectRetina={true}
        className='dark:grayscale dark:invert data-[attention="0"]:!opacity-80'
        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        keepBuffer={4}
        // opacity={attention ? 1 : 0.7}
      />

      {/* Temperature map. */}
      {/* <WMSTileLayer
        url='https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi'
        layers='MODIS_Terra_Land_Surface_Temp_Day'
        format='image/png'
        transparent={true}
        version='1.3.0'
        attribution='NASA GIBS'
      /> */}

      {/* US Weather. */}
      {/* <WMSTileLayer
        url='https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi'
        layers='nexrad-n0r' // layers='nexrad-n0r'
        format='image/png'
        transparent={true}
      /> */}
    </>
  );
};

MapTiles.displayName = 'Map.Tiles';

//
// Markers
//

type MapMarkersProps = {
  markers?: GeoMarker[];
  selected?: string[];
};

const MapMarkers = ({ selected, markers }: MapMarkersProps) => {
  const map = useMap();

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
    <>
      {markers?.map(({ id, title, location: { lat, lng } }) => (
        <Marker
          key={id}
          position={{ lat, lng }}
          icon={
            // TODO(burdon): Create custom icon from bundled assets.
            // TODO(burdon): Selection state.
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
      ))}
    </>
  );
};

MapMarkers.displayName = 'Map.Markers';

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

const MapZoom = ({ onAction, position = 'bottomleft', ...props }: MapControlProps) => (
  <CustomControl position={position} {...props}>
    <ZoomControls onAction={onAction} />
  </CustomControl>
);

const MapAction = ({ onAction, position = 'bottomright', ...props }: MapControlProps) => (
  <CustomControl position={position} {...props}>
    <ActionControls onAction={onAction} />
  </CustomControl>
);

//
// Map
//

export const Map = {
  Root: MapRoot,
  Tiles: MapTiles,
  Markers: MapMarkers,
  Zoom: MapZoom,
  Action: MapAction,
};

export { type MapController, type MapRootProps, type MapTilesProps, type MapMarkersProps, type MapControlProps };
