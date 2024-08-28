//
// Copyright 2023 DXOS.org
//

import { CollectionType, TableType, type MapType } from '@braneframe/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { type Marker } from './MapControl';

export const useMapDetectLocations = (map: MapType): Marker[] => {
  const space = getSpace(map);
  if (!space) {
    // TODO: not sure if throwing error here is right.
    // Am I missing a space getter function that always succeeds?
    throw new Error('MapSection Space is undefined');
  }

  // Automatically gather table rows that are in the same collection as the map.
  // Use them to populate map pins.

  // First find collections that contain the map.
  //
  // TODO: currently we find all of them,
  // but maybe we should switch to only the collection being currently viewed.
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
