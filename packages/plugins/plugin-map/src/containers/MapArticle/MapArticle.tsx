//
// Copyright 2023 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import { useSchemaFilter, type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useType } from '@dxos/react-client/echo';
import { Panel, Flex, type FlexProps, useControlledState } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type GeoMarker, type LatLngLiteral, type MapRootProps } from '@dxos/react-ui-geo';
import { getTagFromQuery, getTypenameFromQuery } from '@dxos/schema';
import { getDeep } from '@dxos/util';

import { type GeoControlProps, GlobeControl, MapControl } from '#components';
import { type Map } from '#types';

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

const mapMapToGlobeZoom = (zoom: number) => interpolate(zoom, ZOOM_ANCHORS.map, ZOOM_ANCHORS.globe);
const mapGlobeToMapZoom = (zoom: number) => interpolate(zoom, ZOOM_ANCHORS.globe, ZOOM_ANCHORS.map);

export type MapControlType = 'globe' | 'map';

export type MapArticleProps = AppSurface.ObjectArticleProps<
  Map.Map,
  GeoControlProps & Pick<MapRootProps, 'onChange'> & { type?: MapControlType }
>;

export const MapArticle = ({
  role,
  subject: object,
  attendableId: _attendableId,
  type: typeProp = 'map',
  center: centerProp,
  zoom: zoomProp,
  onChange,
  ...props
}: MapArticleProps) => {
  const [type, setType] = useControlledState(typeProp);
  const [viewport, setViewport] = useState<{ center: LatLngLiteral; zoom: number }>({
    center: centerProp ?? DEFAULT_CENTER,
    zoom: zoomProp ?? DEFAULT_ZOOM,
  });

  // Sync internal viewport when caller-provided center/zoom change so that MapArticle
  // remains usable as a controlled component.
  useEffect(() => {
    if (centerProp === undefined && zoomProp === undefined) {
      return;
    }
    setViewport((prev) => ({
      center: centerProp ?? prev.center,
      zoom: zoomProp ?? prev.zoom,
    }));
  }, [centerProp, zoomProp]);

  const db = object && Obj.getDatabase(object);
  const [view] = useObject(object?.view);
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;
  const schema = useType(db, typename);
  const baseFilter = useSchemaFilter(schema);
  const query = useMemo(
    () => (tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter)),
    [baseFilter, tag],
  );
  const objects = useQuery(db, query);

  const markers = objects
    .map((row) => {
      if (!view?.projection.pivotFieldId) {
        return undefined;
      }

      const field = view.projection.fields?.find((f) => f.id === view.projection.pivotFieldId);
      const geopoint = field?.path && getDeep(row, field.path.split('.'));
      if (!geopoint) {
        return undefined;
      }

      if (!Array.isArray(geopoint) || geopoint.length < 2) {
        return undefined;
      }

      const [lng, lat] = geopoint;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        return undefined;
      }

      return { id: row.id, location: { lat, lng } } as GeoMarker;
    })
    .filter(Predicate.isNotNullable);

  const selected = useSelected(typename, 'multi');
  const Root = role === 'section' ? Container : Fragment;

  // Store zoom in map units; convert when emitted by the globe.
  const handleMapChange = useCallback(
    (ev: { center: LatLngLiteral; zoom: number }) => {
      setViewport(ev);
      onChange?.(ev);
    },
    [onChange],
  );
  const handleGlobeChange = useCallback(
    (ev: { center: LatLngLiteral; zoom: number }) => {
      const mapped = { center: ev.center, zoom: mapGlobeToMapZoom(ev.zoom) };
      setViewport(mapped);
      onChange?.(mapped);
    },
    [onChange],
  );

  return (
    <Root>
      <Panel.Root>
        <Panel.Content>
          {type === 'map' && (
            <MapControl
              {...props}
              markers={markers}
              selected={selected}
              center={viewport.center}
              zoom={viewport.zoom}
              onChange={handleMapChange}
              onToggle={() => setType('globe')}
            />
          )}
          {type === 'globe' && (
            <GlobeControl
              {...props}
              markers={markers}
              selected={selected}
              center={viewport.center}
              zoom={mapMapToGlobeZoom(viewport.zoom)}
              onChange={handleGlobeChange}
              onToggle={() => setType('map')}
            />
          )}
        </Panel.Content>
      </Panel.Root>
    </Root>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
