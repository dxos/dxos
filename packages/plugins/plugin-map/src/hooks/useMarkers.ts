//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { EchoSchema, getTypename, StoredSchema } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { useStabilizedObject } from './useStabilizedObject';
import { type MapType, type MapMarker } from '../types';

/**
 * @returns Table rows in the same space as the map with `latitude` and `longitude` fields
 */
export const useMarkers = (map?: MapType): MapMarker[] => {
  const space = getSpace(map);

  // TODO(burdon): Configure to select type.
  const latLongSchemas = useQuery(
    space,
    Filter.schema(StoredSchema, (schema) => schema && hasLocation(schema)),
  );

  // TODO(dmaretskyi): I'm guessing this is a query for all objects that are from one of `latLongSchemas` schema.
  // TODO(dmaretskyi): Rework this to use query DSL.
  const rows = useQuery(
    space,
    (obj) => {
      const schemaNames = latLongSchemas.map((schema) => schema.id);
      const typename = getTypename(obj);
      return typename ? schemaNames.includes(typename) : false;
    },
    undefined,
    [latLongSchemas],
  );

  const markers = useMemo(() => {
    return rows
      .filter((row) => typeof row.latitude === 'number' && typeof row.longitude === 'number')
      .map((row) => ({
        id: row.id,
        title: row.title,
        location: {
          lat: row.latitude,
          lng: row.longitude,
        },
      }));
  }, [rows]);

  const markersStabilized = useStabilizedObject(markers, (oldMarkers: MapMarker[], newMarkers: MapMarker[]) => {
    if (oldMarkers.length !== newMarkers.length) {
      return false;
    }
    const newMarkerSet = new Set(newMarkers.map((marker) => marker.id));
    return oldMarkers.every((marker) => newMarkerSet.has(marker.id));
  });

  return markersStabilized;
};

const hasLocation = (schema: StoredSchema): boolean => {
  const properties = new EchoSchema(schema).getProperties();
  return (
    properties.some((prop) => prop.name === 'latitude' && prop.type._tag === 'NumberKeyword') &&
    properties.some((prop) => prop.name === 'longitude' && prop.type._tag === 'NumberKeyword')
  );
};
