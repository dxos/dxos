//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { getTypename, type DynamicSchema } from '@dxos/echo-schema';
import { CollectionType } from '@dxos/plugin-space';
import { TableType } from '@dxos/plugin-table/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { type MapType, type MapMarker } from '../types';

/**
 * Find table rows that are in the same collection as the map.
 * Return the ones with `latitude` and `longitude` fields, converted to `Marker`s.
 *
 * NOTE: This collects rows from all the collections the map is in, even if there's more than one.
 * At the time of writing this behavior won't be exercised since being included in multiple collections
 * is disabled in the UI.
 *
 * If we enable being in more than one collection again we should reconsider what behavior we actually want in that case.
 */
export const useMarkers = (map: MapType): MapMarker[] => {
  const space = getSpace(map);
  const parentCollections = useQuery(
    space,
    Filter.schema(CollectionType, (collection) => collection.objects.some((obj) => obj?.id === map.id)),
  );

  const siblingIds = new Set(
    parentCollections.flatMap((collection) => collection.objects.filter(hasId).map((obj) => obj.id)),
  );

  // TODO(burdon): Configure to select type.
  const siblingTables = useQuery(
    space,
    Filter.schema(TableType, (table) => siblingIds.has(table.id) && table.schema && hasLocation(table.schema)),
    undefined,
    [JSON.stringify(Array.from(siblingIds))], // TODO(burdon): Hack.
  );

  const schemaIds: string[] = siblingTables.flatMap((table) => (table.schema ? [table.schema.id] : []));

  const rows = useQuery(
    // Short circuit if there are no `schemaIds` to find rows for:
    schemaIds.length === 0 ? undefined : space,
    // TODO(seagreen): performance issue since this checks every object.
    //  Doing this with 'or's, e.g., Filter.or(...schemaIds.map((id) => Filter.typename(id)))
    //  is forbidden since the number of 'or's will vary as `schemaIds` changes,
    //  and the internals of `useQuery` require it to be fixed:
    (obj) => {
      const typename = getTypename(obj);
      return typename ? schemaIds.includes(typename) : false;
    },
    undefined,
    [JSON.stringify(Array.from(schemaIds))], // TODO(burdon): Hack.
  );

  return useMemo(() => {
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
};

const hasId = (obj: unknown): obj is { id: string } =>
  typeof obj === 'object' && obj !== null && 'id' in obj && typeof obj.id === 'string';

const hasLocation = (schema: DynamicSchema): boolean => {
  const properties = schema.getProperties();
  return (
    properties.some((prop) => prop.name === 'latitude' && prop.type._tag === 'NumberKeyword') &&
    properties.some((prop) => prop.name === 'longitude' && prop.type._tag === 'NumberKeyword')
  );
};
