//
// Copyright 2023 DXOS.org
//

import { isNotNullable } from 'effect/Predicate';
import React, { useEffect, useState } from 'react';

import { useQuery, getSpace, useSchema, Filter } from '@dxos/react-client/echo';
import { useControlledState } from '@dxos/react-ui';
import { useSelectedItems } from '@dxos/react-ui-attention';
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

// TODO(burdon): Error: Map container is already initialized.

export const MapContainer = ({ role, type: _type = 'map', map, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(_type);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const space = getSpace(map);

  const schema = useSchema(space, map?.view?.target?.query.typename);
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

        if (!Array.isArray(geopoint) || geopoint.length < 2) {
          return undefined;
        }

        const [lng, lat] = geopoint;
        if (typeof lng !== 'number' || typeof lat !== 'number') {
          return undefined;
        }

        return { id: row.id, location: { lat, lng } };
      })
      .filter(isNotNullable);

    setMarkers(newMarkers);
  }, [rowsForType, map?.view?.target]);

  // TODO(burdon): Do something with selected items (ids). (Correlate against `rowsForType`).
  const selected = useSelectedItems(map?.view?.target?.query.typename);

  return (
    <StackItem.Content toolbar={false} size={role === 'section' ? 'square' : 'intrinsic'}>
      {type === 'map' && (
        <MapControl markers={markers} selected={Array.from(selected)} onToggle={() => setType('globe')} {...props} />
      )}
      {type === 'globe' && (
        <GlobeControl markers={markers} selected={Array.from(selected)} onToggle={() => setType('map')} {...props} />
      )}
    </StackItem.Content>
  );
};

export default MapContainer;
