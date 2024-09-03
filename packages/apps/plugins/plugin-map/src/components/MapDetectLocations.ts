//
// Copyright 2023 DXOS.org
//

import { CollectionType, TableType, type MapType } from '@braneframe/types';
import { getTypename, type DynamicSchema } from '@dxos/echo-schema';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { type Marker } from './MapControl';

/**
 * Find table rows that are in the same collection as the map.
 * Return the ones with `latitude` and `longitude` fields,
 * converted to `Marker`s.
 *
 * NOTE: This collects rows from all the collections the map is in,
 * even if there's more than one. At the time of writing this behavior
 * won't be exercised since being included in multiple collections
 * is disabled in the UI.
 *
 * If we enable being in more than one collection again we should
 * reconsider what behavior we actually want in that case.
 */
export const useMapDetectLocations = (map: MapType): Marker[] => {
  const space = getSpace(map);

  const parentCollections = useQuery<CollectionType>(
    space,
    [
      Filter.schema(CollectionType),
      (collection: any) => {
        if (!(collection instanceof CollectionType)) {
          return false;
        }
        return collection.objects.some((obj) => obj?.id === map.id);
      },
    ],
    undefined,
    [space],
  );

  const siblingIds = new Set(
    parentCollections.flatMap((collection) => collection.objects.filter(hasId).map((obj) => obj.id)),
  );

  const siblingTables = useQuery<TableType>(
    space,
    [
      Filter.schema(TableType),
      (table: any) => siblingIds.has(table.id),
      (table: any) => {
        if (!(table instanceof TableType)) {
          return false;
        }
        return table.schema ? schemaHasLatitudeAndLongitude(table.schema) : false;
      },
    ],
    undefined,
    [JSON.stringify(Array.from(siblingIds))],
  );

  const schemaIds: string[] = siblingTables.flatMap((table) => (table.schema ? [table.schema.id] : []));

  const rows = useQuery(
    // Short circuit if there are no `schemaIds` to find rows for:
    schemaIds.length === 0 ? undefined : space,
    // PERFORMANCE: checks every object.
    // Can't pass `Filter.or`s to `useQuery` because we need to a dynamic number of them.
    (obj) => {
      const typename = getTypename(obj);
      return typename ? schemaIds.includes(typename) : false;
    },
    undefined,
    [JSON.stringify(Array.from(schemaIds))],
  );

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
};

export default useMapDetectLocations;

const hasId = (obj: any): obj is { id: string } => typeof obj.id === 'string';

const schemaHasLatitudeAndLongitude = (schema: DynamicSchema): boolean => {
  const properties = schema.getProperties();
  const hasLatitude = properties.some((prop) => prop.name === 'latitude' && prop.type._tag === 'NumberKeyword');
  const hasLongitude = properties.some((prop) => prop.name === 'longitude' && prop.type._tag === 'NumberKeyword');
  return hasLatitude && hasLongitude;
};
