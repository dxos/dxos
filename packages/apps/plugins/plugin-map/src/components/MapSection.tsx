//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';
import { MapContainer } from 'react-leaflet';

import { CollectionType, TableType, type MapType } from '@braneframe/types';
import { Filter, getSpace, useQuery } from '@dxos/react-client/echo';

import { MapControl, type Marker } from './MapControl';

const MapSection: FC<{ map: MapType }> = ({ map }) => {
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

  const rows = useQuery(
    space,
    Filter.typename(schemaIds[0]), // TODO: handle multiple tables
    undefined,
    [siblingTables],
  );

  const locationRows: Marker[] = rows
    .filter((row) => typeof row.latitude === 'number' && typeof row.longitude === 'number')
    .map((row) => ({
      id: row.id,
      location: {
        lat: row.latitude,
        lng: row.longitude,
      },
    }));

  return (
    <div className='bs-96 mlb-2 overflow-auto'>
      <MapContainer className='flex-1 w-full h-full border-t border-neutral-200 dark:border-neutral-800 z-10'>
        <MapControl markers={locationRows} />
      </MapContainer>
    </div>
  );
};

export default MapSection;
