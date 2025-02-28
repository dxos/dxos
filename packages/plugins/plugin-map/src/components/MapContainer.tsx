//
// Copyright 2023 DXOS.org
//

import { isNotNullable } from 'effect/Predicate';
import React, { useEffect, useState } from 'react';

import { useQuery, getSpace, useSchema, Filter } from '@dxos/react-client/echo';
import { useControlledState } from '@dxos/react-ui';
import { type MapMarker, type MapCanvasProps } from '@dxos/react-ui-geo';
import { StackItem } from '@dxos/react-ui-stack';

import { GlobeControl } from './Globe';
import { MapControl } from './Map';
import { type MapType } from '../types';
import { getLocationProperty } from '../util';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = { role?: string; type?: MapControlType; map?: MapType } & Pick<
  MapCanvasProps,
  'zoom' | 'center' | 'onChange'
>;

export const MapContainer = ({ role, type: _type = 'map', map, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(_type);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const space = getSpace(map);

  const schema = useSchema(space, map?.view?.target?.query.type);
  const rowsForType = useQuery(space, schema ? Filter.schema(schema) : undefined);

  useEffect(() => {
    const locationProperty = getLocationProperty(map?.view?.target);
    if (!locationProperty) {
      return;
    }

    const newMarkers: MapMarker[] = (rowsForType ?? [])
      .map((row) => {
        const geopoint = row[locationProperty];
        if (!geopoint) {
          return undefined;
        }

        // TODO(ZaymonFC): Why is table storing it as a string and not an object?
        //   This will need to be updated once we fix that
        const coordinates = geopoint?.split(',').map(Number);
        if (!coordinates || coordinates.length < 2) {
          return undefined;
        }

        const [lat, lng] = coordinates;
        if (!lat || !lng) {
          return undefined;
        }

        return { id: row.id, location: { lat, lng } };
      })
      .filter(isNotNullable);

    setMarkers(newMarkers);
  }, [rowsForType, map?.view?.target]);

  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      {type === 'map' && <MapControl markers={markers} onToggle={() => setType('globe')} {...props} />}
      {type === 'globe' && <GlobeControl markers={markers} onToggle={() => setType('map')} {...props} />}
    </StackItem.Content>
  );
};

export default MapContainer;
