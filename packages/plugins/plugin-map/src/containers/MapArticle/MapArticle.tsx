//
// Copyright 2023 DXOS.org
//

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Flex, type FlexProps, Panel, useControlledState } from '@dxos/react-ui';
import { useSelection } from '@dxos/react-ui-attention';
import { type LatLngLiteral, type MapRootProps } from '@dxos/react-ui-geo';

import { type GeoControlProps, GlobeControl, MapControl } from '#components';
import { type MapCapabilities } from '#types';

// Shared defaults so toggling between map and globe starts at the same position
// when the user hasn't interacted yet.
const DEFAULT_CENTER: LatLngLiteral = { lat: 48, lng: 0 };
const DEFAULT_ZOOM = 5;

// Zoom conversion between Map (Leaflet) and Globe (orthographic scale).
// Defined by two anchor points: linear between, linearly extrapolated outside.
const ZOOM_ANCHORS: { map: [number, number]; globe: [number, number] } = {
  map: [4, 6],
  globe: [2.5, 9],
};

const interpolate = (value: number, from: [number, number], to: [number, number]) => {
  const t = (value - from[0]) / (from[1] - from[0]);
  return to[0] + t * (to[1] - to[0]);
};

// Clamp map zoom-out to 4.
const mapToGlobeZoom = (zoom: number) => interpolate(Math.max(4, zoom), ZOOM_ANCHORS.map, ZOOM_ANCHORS.globe);
const globeToMapZoom = (zoom: number) => Math.floor(interpolate(zoom, ZOOM_ANCHORS.globe, ZOOM_ANCHORS.map));

export type MapControlType = 'globe' | 'map';

export type MapArticleProps = AppSurface.ObjectArticleProps<
  Obj.Any,
  GeoControlProps &
    Pick<MapRootProps, 'onChange'> & {
      type?: MapControlType;
      /** Resolved marker provider for the subject (supplied by the surface). */
      provider?: MapCapabilities.MarkerProvider;
      /** Tile URL template (map variant); defaults to OpenStreetMap when omitted. */
      tileUrl?: string;
      /** Selection writer (supplied by the surface; dispatches `LayoutOperation.Select`). */
      onSelect?: (contextId: string, mode: 'single' | 'multi', id: string) => void;
    }
>;

/**
 * Generic map surface. Renders the markers resolved by a {@link MapCapabilities.MarkerProvider}
 * (built-in for `Map.Map` views; contributed by other plugins, e.g. plugin-trip for `Trip`) as a
 * Leaflet map or 3-D globe. The provider, tile URL and selection writer are resolved by the
 * surface and passed in, keeping this container free of plugin-context hooks.
 */
export const MapArticle = ({ role, subject, provider, ...props }: MapArticleProps) => {
  const Root = role === AppSurface.Section.role ? Container : Fragment;
  return (
    <Root>
      <Panel.Root>
        <Panel.Content>
          {provider && (
            <MapArticleInner key={provider.id} provider={provider} role={role} subject={subject} {...props} />
          )}
        </Panel.Content>
      </Panel.Root>
    </Root>
  );
};

type MapArticleInnerProps = MapArticleProps & { provider: MapCapabilities.MarkerProvider };

/**
 * Inner article mounted once a provider has been resolved (keyed by provider id so switching
 * providers remounts), keeping `provider.useMarkers` an unconditional hook call.
 */
const MapArticleInner = ({
  subject,
  attendableId,
  provider,
  tileUrl,
  type: typeProp = 'map',
  center: centerProp,
  zoom: zoomProp,
  onChange,
  onSelect,
  role: _role,
  ...props
}: MapArticleInnerProps) => {
  const [type, setType] = useControlledState(typeProp);
  const [viewport, setViewport] = useState<{ center: LatLngLiteral; zoom: number }>({
    center: centerProp ?? DEFAULT_CENTER,
    zoom: zoomProp ?? DEFAULT_ZOOM,
  });

  // Sync internal viewport when caller-provided center/zoom change so MapArticle
  // remains usable as a controlled component.
  useEffect(() => {
    if (centerProp === undefined && zoomProp === undefined) {
      return;
    }
    setViewport((prev) => ({ center: centerProp ?? prev.center, zoom: zoomProp ?? prev.zoom }));
  }, [centerProp, zoomProp]);

  const { markers, lines, selection } = provider.useMarkers(subject, { attendableId });

  // Read the attention selection. The provider may override the context/mode (e.g. a view
  // highlights multiple rows by typename); default to single-select against the article.
  const contextId = selection?.contextId ?? attendableId ?? Obj.getURI(subject);
  const mode = selection?.mode ?? 'single';
  const selectedRaw = useSelection(contextId, mode);
  const selected = useMemo(
    () => (Array.isArray(selectedRaw) ? selectedRaw : selectedRaw ? [selectedRaw] : []),
    [selectedRaw],
  );

  const handleSelect = useCallback((id: string) => onSelect?.(contextId, mode, id), [onSelect, contextId, mode]);

  const handleMapChange = useCallback(
    (ev: { center: LatLngLiteral; zoom: number }) => {
      setViewport(ev);
      onChange?.(ev);
    },
    [onChange],
  );

  const handleGlobeChange = useCallback(
    (ev: { center: LatLngLiteral; zoom: number }) => {
      const mapped = { center: ev.center, zoom: globeToMapZoom(ev.zoom) };
      setViewport(mapped);
      onChange?.(mapped);
    },
    [onChange],
  );

  return type === 'map' ? (
    <MapControl
      {...props}
      markers={markers}
      lines={lines}
      selected={selected}
      onSelect={handleSelect}
      tileUrl={tileUrl}
      center={viewport.center}
      zoom={viewport.zoom}
      onChange={handleMapChange}
      onToggle={() => setType('globe')}
    />
  ) : (
    <GlobeControl
      {...props}
      markers={markers}
      lines={lines}
      selected={selected}
      onSelect={handleSelect}
      center={viewport.center}
      zoom={mapToGlobeZoom(viewport.zoom)}
      onChange={handleGlobeChange}
      onToggle={() => setType('map')}
    />
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;

MapArticle.displayName = 'MapArticle';
