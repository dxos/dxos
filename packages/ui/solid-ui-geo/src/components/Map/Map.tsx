//
// Copyright 2023 DXOS.org
//

import 'leaflet/dist/leaflet.css';

import L, { type ControlPosition, type LatLngLiteral, latLngBounds } from 'leaflet';
import {
  type Accessor,
  type JSX,
  type Setter,
  Show,
  createContext,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  useContext,
} from 'solid-js';

import { type GeoMarker } from '../../types';
import { ActionControls, type ControlProps, ZoomControls, controlPositions } from '../Toolbar';

// TODO(burdon): Guess initial location.

const defaults = {
  center: { lat: 51, lng: 0 } as L.LatLngLiteral,
  zoom: 4,
} as const;

//
// Controller
//

export type MapController = {
  setCenter: (center: LatLngLiteral, zoom?: number) => void;
  setZoom: (cb: (zoom: number) => number) => void;
};

//
// Context
//

type MapContextValue = {
  map: Accessor<L.Map | null>;
  attention: Accessor<boolean>;
  setAttention: Setter<boolean>;
  onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
};

const MapContext = createContext<MapContextValue>();

const useMapContext = (displayName: string) => {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error(`${displayName} must be used within Map.Root`);
  }
  return context;
};

//
// Root
//

type MapRootProps = {
  children: JSX.Element;
  ref?: (controller: MapController) => void;
  class?: string;
  scrollWheelZoom?: boolean;
  doubleClickZoom?: boolean;
  touchZoom?: boolean;
  center?: LatLngLiteral;
  zoom?: number;
  onChange?: (ev: { center: LatLngLiteral; zoom: number }) => void;
};

/**
 * https://leafletjs.com/reference.html#map
 */
const MapRoot = (props: MapRootProps) => {
  let mapContainer: HTMLDivElement | undefined;
  const [map, setMap] = createSignal<L.Map | null>(null);
  const [attention, setAttention] = createSignal(false);

  onMount(() => {
    if (!mapContainer) return;

    const leafletMap = L.map(mapContainer, {
      center: props.center ?? defaults.center,
      zoom: props.zoom ?? defaults.zoom,
      attributionControl: false,
      zoomControl: false,
      scrollWheelZoom: props.scrollWheelZoom ?? true,
      doubleClickZoom: props.doubleClickZoom ?? true,
      touchZoom: props.touchZoom ?? true,
    });

    setMap(leafletMap);

    // Set up controller
    if (props.ref) {
      props.ref({
        setCenter: (center: LatLngLiteral, zoom?: number) => {
          leafletMap.setView(center, zoom);
        },
        setZoom: (cb: (zoom: number) => number) => {
          leafletMap.setZoom(cb(leafletMap.getZoom()));
        },
      });
    }

    onCleanup(() => {
      leafletMap.remove();
    });
  });

  // Enable/disable scroll wheel zoom based on attention
  createEffect(() => {
    const leafletMap = map();
    if (!leafletMap) return;

    if (attention()) {
      leafletMap.scrollWheelZoom.enable();
    } else {
      leafletMap.scrollWheelZoom.disable();
    }
  });

  return (
    <MapContext.Provider value={{ map, attention, setAttention, onChange: props.onChange }}>
      <div
        ref={mapContainer}
        class={`group relative grid h-full w-full bg-gray-100 dark:bg-gray-900 ${props.class ?? ''}`}
        style={{ 'z-index': '0' }}
      />
      <Show when={map()}>{props.children}</Show>
    </MapContext.Provider>
  );
};

//
// Tiles
//

type MapTilesProps = object;

const MapTiles = (_props: MapTilesProps) => {
  const { map, onChange, attention } = useMapContext(MapTiles.name);
  let tileLayer: L.TileLayer | null = null;

  createEffect(() => {
    const leafletMap = map();
    if (!leafletMap) return;

    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      detectRetina: true,
      keepBuffer: 4,
      className: attention() ? '' : 'opacity-80',
    });

    tileLayer.addTo(leafletMap);

    // Set up event listeners
    leafletMap.on('zoomstart', (ev) => {
      onChange?.({
        center: ev.target.getCenter(),
        zoom: ev.target.getZoom(),
      });
    });

    onCleanup(() => {
      if (tileLayer) {
        tileLayer.remove();
        tileLayer = null;
      }
    });
  });

  // Update tile layer class when attention changes
  createEffect(() => {
    if (tileLayer) {
      const container = tileLayer.getContainer();
      if (container) {
        container.className = attention() ? '' : 'opacity-80';
      }
    }
  });

  return null;
};

//
// Markers
//

type MapMarkersProps = {
  markers?: GeoMarker[];
  selected?: string[];
};

const MapMarkers = (props: MapMarkersProps) => {
  const { map } = useMapContext(MapMarkers.name);
  const markers: L.Marker[] = [];

  createEffect(() => {
    const leafletMap = map();
    if (!leafletMap) return;

    // Clear existing markers
    markers.forEach((marker) => marker.remove());
    markers.length = 0;

    // Set the viewport around the markers, or show the whole world map if `markers` is empty
    const markerList = props.markers ?? [];
    if (markerList.length > 0) {
      const bounds = latLngBounds(markerList.map((marker) => marker.location));
      leafletMap.fitBounds(bounds);

      // Add new markers
      markerList.forEach(({ id, title, location }) => {
        const marker = L.marker(location, {
          icon: new L.Icon({
            iconUrl: 'https://dxos.network/marker-icon.png',
            iconRetinaUrl: 'https://dxos.network/marker-icon-2x.png',
            shadowUrl: 'https://dxos.network/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        });

        if (title) {
          marker.bindPopup(title);
        }

        marker.addTo(leafletMap);
        markers.push(marker);
      });
    } else {
      leafletMap.setView(defaults.center, defaults.zoom);
    }

    onCleanup(() => {
      markers.forEach((marker) => marker.remove());
      markers.length = 0;
    });
  });

  return null;
};

//
// Controls
//

const CustomControl = (props: { children: JSX.Element; position: ControlPosition }) => {
  const { map: mapAccessor } = useMapContext(CustomControl.name);
  let controlContainer: HTMLDivElement | undefined;

  createEffect(() => {
    const map = mapAccessor();
    if (!map || !controlContainer) return;

    const Control = L.Control.extend({
      onAdd: () => {
        const container = L.DomUtil.create('div', `${controlPositions[props.position]} !m-0`);
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        if (controlContainer) {
          container.appendChild(controlContainer);
        }

        return container;
      },
    });

    const control = new Control({ position: props.position });
    control.addTo(map);

    onCleanup(() => {
      control.remove();
    });
  });

  return (
    <div ref={controlContainer} style={{ display: 'contents' }}>
      {props.children}
    </div>
  );
};

type MapControlProps = { position?: ControlPosition } & Pick<ControlProps, 'onAction'>;

const MapZoom = (props: MapControlProps) => (
  <CustomControl position={props.position ?? 'bottomleft'}>
    <ZoomControls onAction={props.onAction} />
  </CustomControl>
);

const MapAction = (props: MapControlProps) => (
  <CustomControl position={props.position ?? 'bottomright'}>
    <ActionControls onAction={props.onAction} />
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

export { type MapRootProps, type MapTilesProps, type MapMarkersProps, type MapControlProps };
