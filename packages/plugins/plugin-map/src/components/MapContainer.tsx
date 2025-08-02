//
// Copyright 2023 DXOS.org
//

import { isNotNullable } from 'effect/Predicate';
import React, { useEffect, useState } from 'react';

import { useClient } from '@dxos/react-client';
import { useQuery, getSpace, useSchema, Filter } from '@dxos/react-client/echo';
import { useControlledState } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type MapMarker, type MapCanvasProps } from '@dxos/react-ui-geo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

import { GlobeControl } from './Globe';
import { MapControl } from './Map';
import { type Map } from '../types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = {
  role?: string;
  type?: MapControlType;
  view?: DataType.View;
} & Pick<MapCanvasProps, 'zoom' | 'center' | 'onChange'>;

export const MapContainer = ({ role, type: _type = 'map', view, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(_type);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const client = useClient();
  const space = getSpace(view);
  const map = view?.presentation.target as Map.Map | undefined;

  const schema = useSchema(client, space, view?.query.typename);
  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());

  useEffect(() => {
    if (!map) {
      return;
    }

    const newMarkers: MapMarker[] = (objects ?? [])
      .map((row) => {
        if (!map.locationFieldId) {
          return undefined;
        }

        const geopoint = row[map.locationFieldId];
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
  }, [objects, map?.locationFieldId]);

  // TODO(burdon): Do something with selected items (ids). (Correlate against `rowsForType`).
  const selected = useSelected(view?.query.typename, 'multi');

  return (
    <StackItem.Content classNames='h-full' size={role === 'section' ? 'square' : 'intrinsic'}>
      {type === 'map' && (
        <MapControl markers={markers} selected={selected} onToggle={() => setType('globe')} {...props} />
      )}
      {type === 'globe' && (
        <GlobeControl markers={markers} selected={selected} onToggle={() => setType('map')} {...props} />
      )}
    </StackItem.Content>
  );
};

export default MapContainer;
