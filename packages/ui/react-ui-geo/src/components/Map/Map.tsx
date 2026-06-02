//
// Copyright 2023 DXOS.org
//

import 'leaflet/dist/leaflet.css';

import { createContext } from '@radix-ui/react-context';
import L, { Control, type ControlPosition, DomEvent, DomUtil, type LatLngLiteral, point, latLngBounds } from 'leaflet';
import React, { type PropsWithChildren, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MapContainer,
  type MapContainerProps,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import { type ThemedClassName, ThemeProvider, Tooltip } from '@dxos/react-ui';
import { composable, composableProps, defaultTx } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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
  getCenter: () => LatLngLiteral | undefined;
  getZoom: () => number | undefined;
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

const [MapContextProvider, useMapContext] = createContext<MapContextValue>('Map');

//
// Root
//

type MapRootProps = Pick<MapContextValue, 'onChange'>;

/**
 * Context provider for the map. Must wrap Map.Content.
 */
const MapRoot = composable<HTMLDivElement, MapRootProps>(({ children, onChange, ...props }, forwardedRef) => {
  // TODO(burdon): Use attention: const [attention, setAttention] = useState(false);
  const attention = false;
  return (
    <MapContextProvider attention={attention} onChange={onChange}>
      <div
        {...composableProps(props, {
          role: 'none',
          classNames: 'dx-container grid dx-focus-ring-inset',
        })}
        ref={forwardedRef}
      >
        {children}
      </div>
    </MapContextProvider>
  );
});

MapRoot.displayName = 'Map.Root';

//
// Content
//

type MapContentProps = ThemedClassName<Omit<MapContainerProps, 'children'> & PropsWithChildren>;

/**
 * https://react-leaflet.js.org/docs/api-map
 */
const MAP_CONTENT_NAME = 'Map.Content';

/**
 * Recalculates the leaflet map size when its container resizes (e.g. a companion
 * panel opening/closing). Without this, leaflet keeps its stale size and renders
 * blank/gray tiles in the newly-exposed area until the next pan/zoom. Coalesced
 * via rAF to avoid ResizeObserver feedback loops.
 */
const MapResize = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    });
    observer.observe(container);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [map]);

  return null;
};

/**
 * Enables pinch-to-zoom on trackpads / ctrl+wheel. Browsers deliver a trackpad pinch as a `wheel`
 * event with `ctrlKey` set; Leaflet only zooms those via `scrollWheelZoom`, which is intentionally
 * off here (so plain scrolling doesn't hijack the page). This handler zooms on the pinch gesture
 * only, leaving normal wheel scrolling untouched. (Touchscreen pinch is handled by Leaflet's
 * `touchZoom`.)
 */
// Zoom levels per pixel of pinch (ctrl+wheel) delta.
const PINCH_ZOOM_SENSITIVITY = 0.03;

const MapPinchZoom = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    let frame = 0;
    let point: ReturnType<typeof L.point> | undefined;
    // Accumulate the target against the last requested value (not the live, mid-zoom `getZoom()`)
    // and apply once per animation frame without zoom animation — overlapping animated zooms are
    // what made this jittery. Reset between frames so the next batch re-reads the settled zoom.
    let target: number | undefined;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) {
        return;
      }
      event.preventDefault();
      const rect = container.getBoundingClientRect();
      point = L.point(event.clientX - rect.left, event.clientY - rect.top);
      target = (target ?? map.getZoom()) - event.deltaY * PINCH_ZOOM_SENSITIVITY;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (target !== undefined && point) {
            map.setZoomAround(point, target, { animate: false });
            target = undefined;
          }
        });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
};

const MapContent = forwardRef<MapController, MapContentProps>(
  (
    { classNames, scrollWheelZoom = true, doubleClickZoom = true, touchZoom = true, center, zoom, children, ...props },
    forwardedRef,
  ) => {
    const { attention } = useMapContext(MAP_CONTENT_NAME);
    const mapRef = useRef<L.Map>(null);
    const map = mapRef.current;

    useImperativeHandle(
      forwardedRef,
      () => ({
        getCenter: () => {
          const center = mapRef.current?.getCenter();
          return center ? { lat: center.lat, lng: center.lng } : undefined;
        },
        getZoom: () => mapRef.current?.getZoom(),
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
      <MapContainer
        {...props}
        className={mx('group relative grid bg-base-surface!', classNames)}
        attributionControl={false}
        zoomControl={false}
        scrollWheelZoom={scrollWheelZoom}
        doubleClickZoom={doubleClickZoom}
        touchZoom={touchZoom}
        // Allow fractional zoom so trackpad pinch (small ctrl+wheel deltas) isn't rounded away.
        zoomSnap={0}
        center={center ?? defaults.center}
        zoom={zoom ?? defaults.zoom}
        whenReady={() => {}}
        ref={mapRef}
      >
        <MapResize />
        <MapPinchZoom />
        {children}
      </MapContainer>
    );
  },
);

MapContent.displayName = 'Map.Content';

//
// Tiles
// https://react-leaflet.js.org/docs/api-components/#tilelayer
//

const MAP_TILES_NAME = 'Map.Tiles';

/** Default OpenStreetMap raster tile template. */
export const DEFAULT_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

type MapTilesProps = {
  /** Leaflet tile URL template (e.g. a MapTiler style endpoint with an API key). Defaults to OpenStreetMap. */
  url?: string;
};

const MapTiles = ({ url = DEFAULT_TILE_URL }: MapTilesProps) => {
  const ref = useRef<L.TileLayer>(null);
  const { onChange } = useMapContext(MAP_TILES_NAME);

  useMapEvents({
    moveend: (ev) => {
      onChange?.({
        center: ev.target.getCenter(),
        zoom: ev.target.getZoom(),
      });
    },
  });

  // NOTE: Need to dynamically update data attribute since TileLayer doesn't update, but
  // Tailwind requires setting the property for static analysis.
  const { attention } = useMapContext(MAP_TILES_NAME);
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
        url={url}
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

MapTiles.displayName = MAP_TILES_NAME;

//
// Markers
//

type MapMarkersProps = {
  markers?: GeoMarker[];
  /** Connecting lines (e.g. a route). Used here only to extend the viewport fit; drawn by `Map.Lines`. */
  lines?: MapLine[];
  selected?: string[];
  /** Invoked with the marker id when a marker is clicked. */
  onSelect?: (id: string) => void;
};

const MapMarkers = ({ selected, markers, lines, onSelect }: MapMarkersProps) => {
  const map = useMap();

  // Fit the viewport around the markers and any connecting lines. When there is nothing to frame,
  // leave the current view alone so caller-provided center/zoom (or prior interaction) is preserved.
  useEffect(() => {
    const points: LatLngLiteral[] = [
      ...(markers?.map((marker) => marker.location) ?? []),
      ...(lines?.flatMap((line) => [line.source, line.target]) ?? []),
    ];
    if (points.length > 0) {
      const bounds = latLngBounds(points);
      const size = map.getSize();
      const padding = Math.max(48, Math.min(size.x, size.y) / 6);
      // `animate: false`: a deferred zoom animation can outlive the map (e.g. on unmount) and throw
      // a Leaflet `_leaflet_pos` error against a removed layer; fitting instantly avoids the race.
      map.fitBounds(bounds, { padding: point(padding, padding), animate: false });
    }
  }, [markers, lines, map]);

  return (
    <>
      {markers?.map(({ id, title, location: { lat, lng } }) => {
        return (
          <Marker
            key={id}
            position={{ lat, lng }}
            eventHandlers={onSelect ? { click: () => onSelect(id) } : undefined}
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
        );
      })}
    </>
  );
};

MapMarkers.displayName = 'Map.Markers';

//
// Lines
//

/** A connecting line between two points (e.g. a route leg). `color` is any CSS/Leaflet stroke color. */
export type MapLine = { source: LatLngLiteral; target: LatLngLiteral; color?: string };

type MapLinesProps = {
  lines?: MapLine[];
};

const MapLines = ({ lines }: MapLinesProps) => {
  if (!lines || lines.length === 0) {
    return null;
  }

  return (
    <>
      {lines.map(({ source, target, color }, index) => (
        <Polyline key={index} positions={[source, target]} pathOptions={{ color, weight: 4, opacity: 0.8 }} />
      ))}
    </>
  );
};

MapLines.displayName = 'Map.Lines';

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
  const rootRef = useRef<ReturnType<typeof createRoot> | undefined>(undefined);

  // Mount the leaflet control (and its React root) once per map/position. Children are
  // rendered into the persistent root by the effect below, so updating them does NOT
  // tear down and re-add the control (which would flicker on every parent re-render).
  useEffect(() => {
    const control = new Control({ position });
    control.onAdd = () => {
      const container = DomUtil.create('div', mx('m-0!', controlPositions[position]));
      DomEvent.disableClickPropagation(container);
      DomEvent.disableScrollPropagation(container);
      const root = createRoot(container);
      rootRef.current = root;
      // Initial render — covers mount and any map/position remount; the effect below
      // handles subsequent children-only updates.
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
      const root = rootRef.current;
      rootRef.current = undefined;
      // Defer unmount so it doesn't run synchronously during a React render/commit.
      queueMicrotask(() => root?.unmount());
    };
  }, [map, position]);

  // Re-render children into the persistent root whenever they change.
  useEffect(() => {
    rootRef.current?.render(
      <ThemeProvider tx={defaultTx}>
        <Tooltip.Provider>{children}</Tooltip.Provider>
      </ThemeProvider>,
    );
  }, [children]);

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
  Content: MapContent,
  Tiles: MapTiles,
  Markers: MapMarkers,
  Lines: MapLines,
  Zoom: MapZoom,
  Action: MapAction,
};

export {
  type MapController,
  type MapRootProps,
  type MapContentProps,
  type MapTilesProps,
  type MapMarkersProps,
  type MapLinesProps,
  type MapControlProps,
};
