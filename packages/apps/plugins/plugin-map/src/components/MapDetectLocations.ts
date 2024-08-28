//
// Copyright 2023 DXOS.org
//

import { CollectionType, TableType, type MapType } from '@braneframe/types';
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
  if (!space) {
    // TODO: not sure if throwing error here is right.
    // Am I missing a space getter function that always succeeds?
    throw new Error('MapSection Space is undefined');
  }

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

  // All objects that appear beside the map in a collection.
  const mapSiblingIds: Record<string, null> = {};
  parentCollections.forEach((collection) => {
    collection.objects.forEach((obj) => {
      if (obj?.id) {
        mapSiblingIds[obj.id] = null;
      }
    });
  });

  const siblingTables = useQuery<TableType>(
    space,
    [Filter.schema(TableType), (table: any) => table.id in mapSiblingIds],
    undefined,
    [parentCollections],
  );

  // TODO: filter these for only schemas with latitude and longitude fields.
  const schemaIds: string[] = siblingTables.flatMap((table) => (table.schema ? [table.schema.id] : []));

  const rows = useQuery(space, Filter.or(...schemaIds.map((id) => Filter.typename(id))), undefined, [siblingTables]);

  return rows
    .filter((row) => typeof row.latitude === 'number' && typeof row.longitude === 'number')
    .map((row) => ({
      id: row.id,
      location: {
        lat: row.latitude,
        lng: row.longitude,
      },
    }));
};

export default useMapDetectLocations;
