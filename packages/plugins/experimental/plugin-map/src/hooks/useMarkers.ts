//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { DynamicSchema, getTypename, StoredSchema } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { type MapType, type MapMarker } from '../types';

/**
 * @returns Table rows in the same space as the map with `latitude` and `longitude` fields
 */
export const useMarkers = (map: MapType): MapMarker[] => {
  const space = getSpace(map);

  // TODO(burdon): Configure to select type.
  const schemas = useQuery(
    space,
    Filter.schema(StoredSchema, (schema) => schema && hasLocation(schema)),
  );

  const objects = useQuery(
    space,
    (obj) => {
      const schemaNames = schemas.map((schema) => schema.id);
      const typename = getTypename(obj);
      return typename ? schemaNames.includes(typename) : false;
    },
    undefined,
    [schemas],
  );

  const markers = useMemo(() => {
    return objects
      .filter((row) => typeof row.latitude === 'number' && typeof row.longitude === 'number')
      .map((row) => ({
        id: row.id,
        title: row.title,
        location: {
          lat: row.latitude,
          lng: row.longitude,
        },
      }));
  }, [JSON.stringify(objects.map((obj) => obj.id))]); // TODO(seagreen): Hack.

  return markers;
};

const hasLocation = (schema: StoredSchema): boolean => {
  const properties = new DynamicSchema(schema).getProperties();
  return (
    properties.some((prop) => prop.name === 'latitude' && prop.type._tag === 'NumberKeyword') &&
    properties.some((prop) => prop.name === 'longitude' && prop.type._tag === 'NumberKeyword')
  );
};
