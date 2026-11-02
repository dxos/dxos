import L from 'leaflet';
//
// Copyright 2026 DXOS.org
//
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';

import { Map as GeoMap } from '@dxos/react-ui-geo';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import { type ThemedClassName } from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

import {
  type AreaOverride,
  type AreaShape,
  DEFAULT_SOFT_M,
  type Rateable,
  type Rating,
  type RatingOverrides,
} from '../../model/rating.ts';
import { LighthouseNamespace } from '../../namespace.ts';
import {
  type Pin,
  type PinText,
  clusterPins,
  colourOf,
  countInside,
  hueOf,
  metres,
  nameFor,
  simplify,
  summarize,
  toPins,
} from './pins.ts';

// Ported from lighthouse `web/src/components/ResultsMap.tsx` (SPEC "Areas on the map", D-147–D-149, WEB QA-8). The
// map frame is react-ui-geo's Map (Leaflet + react-leaflet, OSM tiles, resize and pinch handling); the pins,
// clustering, drawing and areas are imperative Leaflet layers on its L.Map, as in the web UI.

/** OSM's tile server and the attribution its tile usage policy requires. */
const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

/** Warsaw, until the results' bounds are known. */
const DEFAULT_CENTER = { lat: 52.2297, lng: 21.0122 };

/** Path colours: Leaflet writes them as SVG attributes, which cannot read CSS variables. */
const ACCENT = '#2f6fdb';
const REQUIRE = '#7c3aed';

type Mode = 'idle' | 'lasso' | 'circle';

const escape = (text: string) =>
  text.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);

/** Metres per screen pixel at the map's zoom, at a latitude. */
const metresPerPixel = (map: L.Map, lat: number) =>
  (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** map.getZoom();

const layerOf = (shape: AreaShape, options: L.PathOptions): L.Path =>
  shape.type === 'Circle'
    ? L.circle([shape.center[1], shape.center[0]], { ...options, radius: shape.radiusM })
    : L.polygon(
        shape.coordinates.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])),
        options,
      );

const boundsOf = (shape: AreaShape): L.LatLngBounds =>
  shape.type === 'Circle'
    ? L.latLng(shape.center[1], shape.center[0]).toBounds(shape.radiusM * 2)
    : L.latLngBounds((shape.coordinates[0] ?? []).map(([lng, lat]) => [lat, lng] as [number, number]));

const PIN_STYLE =
  'display:block;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgb(0 0 0 / 0.45);cursor:pointer';
const LANDMARK_HTML =
  '<span style="display:block;width:9px;height:9px;border-radius:2px;background:#8a8a8a;border:1.5px solid #fff;opacity:0.8;transform:rotate(45deg)"></span>';
const HANDLE_STYLE = `display:block;width:14px;height:14px;border-radius:3px;background:#fff;border:2px solid ${ACCENT};box-shadow:0 1px 3px rgb(0 0 0 / 0.4)`;

/** Hands the react-leaflet map to the component, and adds the zoom buttons and the OSM attribution. */
const MapReady = ({ onMap }: { onMap: (map: L.Map | undefined) => void }) => {
  const map = useMap();
  useEffect(() => {
    const attribution = L.control.attribution({ prefix: false }).addAttribution(OSM_ATTRIBUTION).addTo(map);
    const zoom = L.control.zoom({ position: 'topleft' }).addTo(map);
    onMap(map);
    return () => {
      attribution.remove();
      zoom.remove();
      onMap(undefined);
    };
  }, [map, onMap]);
  return null;
};

export type ResultsMapProps<T extends Rateable = Rateable> = ThemedClassName<{
  items: ReadonlyArray<T>;
  ratings?: ReadonlyMap<string, Rating>;
  overrides: RatingOverrides | null | undefined;
  /** A pin's tooltip: the result's title and a detail line (price, address). */
  describe: (item: T) => PinText;
  /** Bumped to start drawing a lasso (the rating model panel's "Draw an area"). */
  drawRequest?: number;
  selected?: string;
  /** The overrides with the areas drawn or edited: re-rank at once, save debounced. */
  onOverrides: (next: RatingOverrides) => void;
  /** A pin was clicked. */
  onSelect?: (id: string) => void;
}>;

/**
 * The results on an OSM map: a pin per located result, coloured by score and clustered when dense, and the areas the
 * person draws (a lasso, or a circle around a point) as ranking preferences or requirements.
 */
export const ResultsMap = <T extends Rateable>({
  classNames,
  items,
  ratings,
  overrides,
  describe,
  drawRequest,
  selected,
  onOverrides,
  onSelect,
}: ResultsMapProps<T>) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [map, setMap] = useState<L.Map>();
  const layers = useRef<{ pins: L.LayerGroup; areas: L.LayerGroup; draft: L.LayerGroup }>(undefined);
  const [mode, setMode] = useState<Mode>('idle');
  const [active, setActive] = useState<string>();
  const [zoom, setZoom] = useState(0);
  const areas = useMemo<ReadonlyArray<AreaOverride>>(() => overrides?.areas ?? [], [overrides?.areas]);

  // The latest values, for map handlers bound once.
  const live = useRef({ areas, overrides, items, onOverrides, onSelect });
  live.current = { areas, overrides, items, onOverrides, onSelect };

  const setAreas = useCallback(
    (next: ReadonlyArray<AreaOverride>) => live.current.onOverrides({ ...live.current.overrides, areas: [...next] }),
    [],
  );
  const patch = useCallback(
    (id: string, change: Partial<AreaOverride>) =>
      setAreas(live.current.areas.map((area) => (area.id === id ? { ...area, ...change } : area))),
    [setAreas],
  );

  const pins = useMemo(() => toPins(items, ratings, areas, describe), [items, ratings, areas, describe]);
  const summary = useMemo(() => summarize(pins, items.length), [pins, items.length]);

  // The layers, once the map is up.
  useEffect(() => {
    if (!map) {
      return;
    }
    const groups = {
      areas: L.layerGroup().addTo(map),
      pins: L.layerGroup().addTo(map),
      draft: L.layerGroup().addTo(map),
    };
    layers.current = groups;
    // A fresh number on every move, so the clusters regroup at the new zoom.
    const onMove = () => setZoom(map.getZoom() + Math.random() * 1e-6);
    map.on('zoomend moveend', onMove);
    setZoom(map.getZoom());
    return () => {
      map.off('zoomend moveend', onMove);
      groups.areas.remove();
      groups.pins.remove();
      groups.draft.remove();
      layers.current = undefined;
    };
  }, [map]);

  // Fit the located results once they arrive.
  const fitted = useRef(false);
  useEffect(() => {
    if (!map || fitted.current || !pins.length) {
      return;
    }
    fitted.current = true;
    map.fitBounds(L.latLngBounds(pins.map((pin) => [pin.lat, pin.lng] as [number, number])), {
      padding: [28, 28],
      maxZoom: 15,
      animate: false,
    });
  }, [map, pins]);

  // Pins, clustered on a 44 px grid at the current zoom; landmarks small and grey under them.
  useEffect(() => {
    const layer = layers.current?.pins;
    if (!map || !layer) {
      return;
    }
    layer.clearLayers();
    const scores = pins.flatMap((pin) => (pin.score === undefined ? [] : [pin.score]));
    const lo = Math.min(...scores);
    const hi = Math.max(...scores);
    const z = map.getZoom();
    for (const pin of pins.filter((pin) => pin.landmark)) {
      L.marker([pin.lat, pin.lng], {
        icon: L.divIcon({ className: 'lh-pin-wrap', html: LANDMARK_HTML, iconSize: [9, 9], iconAnchor: [4.5, 4.5] }),
        title: pin.title,
        zIndexOffset: -1000,
      })
        .bindTooltip(
          `${escape(pin.title)}<br><span style="opacity:.7">not rated (${escape(pin.detail || 'a place')})</span>`,
          { direction: 'top' },
        )
        .addTo(layer);
    }
    const groups = clusterPins(
      pins.filter((pin) => !pin.landmark),
      (pin) => map.project([pin.lat, pin.lng], z),
      { exact: z >= 17 },
    );
    for (const group of groups) {
      if (group.length === 1 || group.some((pin) => pin.id === selected)) {
        for (const pin of group) {
          addPin(layer, pin, colourOf(hueOf(pin.score, lo, hi)), pin.id === selected, (id) =>
            live.current.onSelect?.(id),
          );
        }
        continue;
      }
      addCluster(layer, map, group, (best) => colourOf(hueOf(best.score, lo, hi)));
    }
  }, [map, pins, zoom, selected]);

  // Areas: the shape, its soft edge as a faint band (a circle's as a dashed ring), and handles on the active circle.
  useEffect(() => {
    const layer = layers.current?.areas;
    if (!map || !layer) {
      return;
    }
    layer.clearLayers();
    for (const area of areas) {
      const soft = area.softM ?? DEFAULT_SOFT_M;
      const colour = area.mode === 'require' ? REQUIRE : ACCENT;
      if (soft > 0) {
        if (area.shape.type === 'Circle') {
          layerOf(
            { ...area.shape, radiusM: area.shape.radiusM + soft },
            { color: colour, opacity: 0.55, weight: 1.5, dashArray: '5 6', fillOpacity: 0.04, interactive: false },
          ).addTo(layer);
        } else {
          const lat = area.shape.coordinates[0]?.[0]?.[1] ?? DEFAULT_CENTER.lat;
          layerOf(area.shape, {
            color: colour,
            opacity: 0.1,
            weight: Math.max(2, (2 * soft) / metresPerPixel(map, lat)),
            lineJoin: 'round',
            lineCap: 'round',
            fill: false,
            interactive: false,
          }).addTo(layer);
        }
      }
      const isActive = area.id === active;
      const shape = layerOf(area.shape, {
        color: colour,
        weight: isActive ? 3.5 : area.mode === 'require' ? 3 : 2,
        fillColor: colour,
        fillOpacity: isActive ? 0.2 : area.mode === 'require' ? 0.16 : 0.1,
        bubblingMouseEvents: false,
      });
      shape.bindTooltip(
        `${escape(area.label)} · ${area.mode === 'require' ? 'required' : 'preferred'}${soft ? ` · soft edge ${metres(soft)}` : ''}`,
        { sticky: true },
      );
      shape.on('click', () => setActive(area.id));
      shape.addTo(layer);
      if (isActive && area.shape.type === 'Circle' && mode === 'idle') {
        addCircleHandles(layer, shape as L.Circle, area.shape, (next) => patch(area.id, { shape: next }));
      }
    }
  }, [map, areas, active, zoom, mode, patch]);

  // Drawing: a lasso (drag around the area; it closes itself) or a circle (press the centre, drag out the radius).
  useEffect(() => {
    const draft = layers.current?.draft;
    if (!map || !draft || mode === 'idle') {
      return;
    }
    const box = map.getContainer();
    map.dragging.disable();
    map.doubleClickZoom.disable();
    box.style.cursor = 'crosshair';
    box.style.touchAction = 'none';
    let down = false;
    let points: L.LatLng[] = [];
    let line: L.Polyline | undefined;
    let closing: L.Polyline | undefined;
    let circle: L.Circle | undefined;
    let centre: L.LatLng | undefined;
    const at = (event: PointerEvent) => map.mouseEventToLatLng(event);
    const finish = (shape: AreaShape | undefined) => {
      draft.clearLayers();
      setMode('idle');
      if (!shape) {
        return;
      }
      const { areas: current, items } = live.current;
      const area: AreaOverride = {
        id: `a-${Date.now().toString(36)}`,
        label: nameFor(shape, items, current.length + 1),
        shape,
        mode: 'prefer',
        softM: DEFAULT_SOFT_M,
      };
      setAreas([...current, area]);
      setActive(area.id);
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target as HTMLElement).closest('.leaflet-control')) {
        return;
      }
      event.preventDefault();
      box.setPointerCapture(event.pointerId);
      down = true;
      if (mode === 'lasso') {
        points = [at(event)];
        line = L.polyline(points, { color: ACCENT, weight: 2.5, interactive: false }).addTo(draft);
        closing = L.polyline([], {
          color: ACCENT,
          weight: 2.5,
          opacity: 0.6,
          dashArray: '6 6',
          interactive: false,
        }).addTo(draft);
      } else {
        centre = at(event);
        circle = L.circle(centre, {
          radius: 1,
          color: ACCENT,
          weight: 2.5,
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(draft);
        circle.bindTooltip('', { permanent: true, direction: 'right' });
      }
    };
    const onMove = (event: PointerEvent) => {
      if (!down) {
        return;
      }
      if (mode === 'lasso' && line && closing) {
        points.push(at(event));
        line.setLatLngs(points);
        const first = points[0];
        const last = points[points.length - 1];
        if (first && last) {
          closing.setLatLngs([last, first]);
        }
      } else if (circle && centre) {
        const radius = centre.distanceTo(at(event));
        circle.setRadius(radius);
        circle.setTooltipContent(metres(radius));
        circle.openTooltip(at(event));
      }
    };
    const onUp = (event: PointerEvent) => {
      if (!down) {
        return;
      }
      down = false;
      if (mode === 'lasso') {
        const z = map.getZoom();
        const corners = simplify(
          points.map((point) => map.project(point, z)),
          3,
        );
        if (corners.length < 3) {
          return finish(undefined);
        }
        const ring = corners.map((corner) => map.unproject(corner, z)).map((p) => [p.lng, p.lat] as [number, number]);
        const [start] = ring;
        finish(start ? { type: 'Polygon', coordinates: [[...ring, start]] } : undefined);
      } else if (centre) {
        const radius = centre.distanceTo(at(event));
        // A click without a drag: a circle of 600 m (about a seven-minute walk) around the point.
        finish({ type: 'Circle', center: [centre.lng, centre.lat], radiusM: Math.round(radius < 40 ? 600 : radius) });
      }
    };
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && finish(undefined);
    box.addEventListener('pointerdown', onDown);
    box.addEventListener('pointermove', onMove);
    box.addEventListener('pointerup', onUp);
    window.addEventListener('keydown', onKey);
    return () => {
      box.removeEventListener('pointerdown', onDown);
      box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointerup', onUp);
      window.removeEventListener('keydown', onKey);
      box.style.cursor = '';
      box.style.touchAction = '';
      map.dragging.enable();
      map.doubleClickZoom.enable();
      draft.clearLayers();
    };
  }, [map, mode, setAreas]);

  useEffect(() => {
    if (drawRequest) {
      setMode('lasso');
    }
  }, [drawRequest]);

  // Pan to a result selected elsewhere (its card).
  useEffect(() => {
    const pin = selected ? pins.find((pin) => pin.id === selected) : undefined;
    if (pin && map && !map.getBounds().contains([pin.lat, pin.lng])) {
      map.panTo([pin.lat, pin.lng]);
    }
    // Only on a new selection: re-ranking must not pan the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, map]);

  const handleMap = useCallback((next: L.Map | undefined) => setMap(next), []);

  return (
    <Layout.Flex
      column
      classNames={mx('border-b border-separator bg-group-surface', classNames)}
      role='region'
      aria-label={t('map.label')}
      data-testid='lighthouse.map'
    >
      <Layout.Flex gap='sm' align='center' wrap classNames='px-2 py-1 border-b border-separator'>
        <span className='text-xs text-fg-muted tabular-nums grow min-w-0' data-testid='lighthouse.map.count'>
          {t('map-count.label', { rated: summary.rated, total: summary.ratable })}
          {summary.landmarks > 0 && t('map-landmarks.label', { count: summary.landmarks })}
          {areas.length > 0 &&
            t('map-inside.label', {
              count: areas.length,
              inside: summary.inside,
              near: summary.near ? t('map-near.label', { count: summary.near }) : '',
            })}
          {summary.unlocated > 0 && t('map-unlocated.label', { count: summary.unlocated })}
        </span>
        {mode === 'idle' ? (
          <>
            <Button.Root
              variant='ghost'
              icon='ph--lasso--regular'
              label={t('map-lasso.label')}
              onClick={() => setMode('lasso')}
              data-testid='lighthouse.map.lasso'
            />
            <Button.Root
              variant='ghost'
              icon='ph--circle-dashed--regular'
              label={t('map-circle.label')}
              onClick={() => setMode('circle')}
              data-testid='lighthouse.map.circle'
            />
          </>
        ) : (
          <>
            <span className='text-xs font-medium text-accent-text' role='status' data-testid='lighthouse.map.hint'>
              {t(mode === 'lasso' ? 'map-lasso.hint' : 'map-circle.hint')}
            </span>
            <Button.Root variant='ghost' label={t('map-cancel.label')} onClick={() => setMode('idle')} />
          </>
        )}
      </Layout.Flex>
      <div className='relative h-[min(40vh,26rem)] min-h-52' data-testid='lighthouse.map.canvas'>
        <GeoMap.Root>
          <GeoMap.Viewport classNames='dx-cover' center={DEFAULT_CENTER} zoom={12}>
            <GeoMap.Tiles url={OSM_TILES} />
            <MapReady onMap={handleMap} />
          </GeoMap.Viewport>
        </GeoMap.Root>
      </div>
      {areas.length > 0 && (
        <Layout.Flex
          column
          gap='xs'
          classNames='px-2 py-1.5 border-t border-separator'
          role='list'
          aria-label={t('map-areas.label')}
        >
          {areas.map((area) => (
            <AreaChip
              key={area.id}
              area={area}
              active={area.id === active}
              count={countInside(pins, area)}
              onFocus={() => setActive(area.id)}
              onChange={(change) => patch(area.id, change)}
              onDelete={() => {
                setAreas(areas.filter((other) => other.id !== area.id));
                setActive(undefined);
              }}
              onZoom={() => map?.fitBounds(boundsOf(area.shape), { padding: [30, 30] })}
            />
          ))}
        </Layout.Flex>
      )}
    </Layout.Flex>
  );
};

ResultsMap.displayName = 'ResultsMap';

const addPin = (layer: L.LayerGroup, pin: Pin, colour: string, selected: boolean, onSelect: (id: string) => void) => {
  const dim = pin.fit === undefined || pin.fit === 1 ? 1 : pin.fit > 0 ? 0.65 : 0.3;
  const size = selected ? 18 : 14;
  const ring = selected ? `;outline:3px solid ${ACCENT};outline-offset:1px` : '';
  const marker = L.marker([pin.lat, pin.lng], {
    icon: L.divIcon({
      className: 'lh-pin-wrap',
      html: `<span data-testid="lighthouse.map.pin" data-pin="${escape(pin.id)}" style="${PIN_STYLE};width:${size}px;height:${size}px;background:${colour};opacity:${dim}${ring}"></span>`,
      iconSize: [size + 2, size + 2],
      iconAnchor: [(size + 2) / 2, (size + 2) / 2],
    }),
    keyboard: true,
    title: pin.title,
    zIndexOffset: selected ? 1000 : Math.round((pin.score ?? 0) * 100),
  });
  const where =
    pin.fit === undefined
      ? ''
      : ` · ${pin.fit === 1 ? 'inside your area' : pin.fit > 0 ? 'near your area' : 'outside your areas'}`;
  marker.bindTooltip(
    `<strong>${escape(pin.title)}</strong><br>${escape(pin.detail)}${pin.score !== undefined ? `<br>score ${Math.round(pin.score * 100)}` : ''}${where}`,
    { direction: 'top', offset: [0, -8] },
  );
  marker.on('click', () => onSelect(pin.id));
  marker.addTo(layer);
};

const addCluster = (layer: L.LayerGroup, map: L.Map, group: Pin[], colourOfBest: (best: Pin) => string) => {
  const best = group.reduce((a, b) => ((b.score ?? -1) > (a.score ?? -1) ? b : a));
  const lat = group.reduce((sum, pin) => sum + pin.lat, 0) / group.length;
  const lng = group.reduce((sum, pin) => sum + pin.lng, 0) / group.length;
  const inside = group.filter((pin) => pin.fit === 1).length;
  const size = group.length >= 10 ? 34 : 28;
  const colour = colourOfBest(best);
  const faded = group.every((pin) => pin.fit === 0) ? 0.45 : 1;
  const cluster = L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'lh-pin-wrap',
      html: `<span data-testid="lighthouse.map.cluster" style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:color-mix(in srgb, ${colour} 85%, white);color:#fff;font-size:0.75rem;font-weight:700;border:2px solid #fff;box-shadow:0 0 0 4px color-mix(in srgb, ${colour} 30%, transparent), 0 1px 3px rgb(0 0 0 / 0.4);cursor:zoom-in;opacity:${faded}">${group.length}</span>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    }),
    title: `${group.length} results`,
    zIndexOffset: 2000,
  });
  cluster.bindTooltip(
    `${group.length} results${inside ? ` · ${inside} inside your areas` : ''}<br>best: ${escape(best.title)}`,
    { direction: 'top', offset: [0, -size / 2] },
  );
  cluster.on('click', () =>
    map.fitBounds(L.latLngBounds(group.map((pin) => [pin.lat, pin.lng] as [number, number])), {
      padding: [40, 40],
      maxZoom: 18,
    }),
  );
  cluster.addTo(layer);
};

/** Move and resize handles on the active circle. */
const addCircleHandles = (
  layer: L.LayerGroup,
  shape: L.Circle,
  circle: Extract<AreaShape, { type: 'Circle' }>,
  onChange: (next: AreaShape) => void,
) => {
  const centre = L.latLng(circle.center[1], circle.center[0]);
  const east = L.latLng(centre.lat, centre.lng + circle.radiusM / (111_320 * Math.cos((centre.lat * Math.PI) / 180)));
  const handle = (at: L.LatLng, title: string, cursor: string) =>
    L.marker(at, {
      draggable: true,
      title,
      icon: L.divIcon({
        className: 'lh-pin-wrap',
        html: `<span style="${HANDLE_STYLE};cursor:${cursor}"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      }),
    });
  const move = handle(centre, 'Move the circle', 'move').addTo(layer);
  const edge = handle(east, 'Resize the circle', 'ew-resize').addTo(layer);
  move.on('drag', (event) => shape.setLatLng((event.target as L.Marker).getLatLng()));
  move.on('dragend', (event) => {
    const point = (event.target as L.Marker).getLatLng();
    onChange({ type: 'Circle', center: [point.lng, point.lat], radiusM: circle.radiusM });
  });
  edge.on('drag', (event) => shape.setRadius(centre.distanceTo((event.target as L.Marker).getLatLng())));
  edge.on('dragend', (event) =>
    onChange({
      type: 'Circle',
      center: circle.center,
      radiusM: Math.max(50, Math.round(centre.distanceTo((event.target as L.Marker).getLatLng()))),
    }),
  );
};

type AreaChipProps = {
  area: AreaOverride;
  active: boolean;
  count: number;
  onFocus: () => void;
  onChange: (change: Partial<AreaOverride>) => void;
  onDelete: () => void;
  onZoom: () => void;
};

/** One drawn area: its name (editable), prefer or require, the soft edge, the count inside, zoom and delete. */
const AreaChip = ({ area, active, count, onFocus, onChange, onDelete, onZoom }: AreaChipProps) => {
  const { t } = Hooks.useTranslation(LighthouseNamespace.key);
  const [label, setLabel] = useState(area.label);
  useEffect(() => setLabel(area.label), [area.label]);
  const soft = area.softM ?? DEFAULT_SOFT_M;
  return (
    <div
      role='listitem'
      className={mx(
        'flex flex-wrap items-center gap-2 px-1.5 py-1 rounded-sm border text-sm',
        active ? 'border-accent-surface bg-base-surface' : 'border-transparent',
      )}
      onFocus={onFocus}
      onClick={onFocus}
      data-testid='lighthouse.map.area'
      data-area={area.id}
    >
      <Button.Root
        variant='ghost'
        iconOnly
        icon={area.shape.type === 'Circle' ? 'ph--circle-dashed--regular' : 'ph--polygon--regular'}
        label={t('map-area-zoom.label', { area: area.label })}
        onClick={onZoom}
        data-testid='lighthouse.map.area.zoom'
      />
      <Input.Root
        variant='subdued'
        classNames='w-auto max-w-64 font-semibold'
        value={label}
        size={Math.max(6, label.length)}
        aria-label={t('map-area-name.label')}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => label.trim() && label !== area.label && onChange({ label: label.trim() })}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        data-testid='lighthouse.map.area.name'
      />
      <span className='text-xs text-fg-muted tabular-nums'>
        {t('map-area-inside.label', { count })}
        {area.shape.type === 'Circle' ? ` · ${metres(area.shape.radiusM)}` : ''}
      </span>
      <ToggleGroup.Root
        type='single'
        value={area.mode ?? 'prefer'}
        onValueChange={(value) => (value === 'prefer' || value === 'require') && onChange({ mode: value })}
        aria-label={t('map-area-mode.label')}
      >
        {(['prefer', 'require'] as const).map((value) => (
          <ToggleGroup.Item key={value} value={value} data-testid={`lighthouse.map.area.${value}`}>
            {t(`map-area-${value}.label`)}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      <Layout.Flex gap='xs' align='center'>
        <span className='text-xs text-fg-muted'>{t('map-area-soft.label')}</span>
        {/* The slider has no intrinsic width: without a sized box it collapses to its thumb. */}
        <div className='w-28 shrink-0'>
          <Input.Slider
            aria-label={t('map-area-soft-of.label', { area: area.label })}
            min={0}
            max={2000}
            step={50}
            value={[soft]}
            onValueChange={([value]) => value !== undefined && onChange({ softM: value })}
            data-testid='lighthouse.map.area.soft'
          />
        </div>
        <span className='text-xs tabular-nums min-w-12'>{soft ? metres(soft) : t('map-area-soft-none.label')}</span>
      </Layout.Flex>
      <Button.Root
        variant='ghost'
        iconOnly
        icon='ph--trash--regular'
        label={t('map-area-delete.label', { area: area.label })}
        onClick={onDelete}
        data-testid='lighthouse.map.area.delete'
      />
    </div>
  );
};
