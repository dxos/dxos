//
// Copyright 2023 DXOS.org
//

import { isNotNullable } from 'effect/Predicate';
import React from 'react';

import { useClient } from '@dxos/react-client';
import { Filter, getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { useControlledState } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type GeoMarker, type MapRootProps } from '@dxos/react-ui-geo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType, typenameFromQuery } from '@dxos/schema';
import { getDeep } from '@dxos/util';

import { type Map } from '../types';

import { GlobeControl } from './Globe';
import { MapControl } from './Map';
import { type GeoControlProps } from './types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = {
  role?: string;
  type?: MapControlType;
  view?: DataType.View;
  map?: Map.Map;
} & GeoControlProps &
  Pick<MapRootProps, 'onChange'>;

export const MapContainer = ({ role, type: _type = 'map', view, map: _map, ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(_type);
  const client = useClient();
  const space = getSpace(view);
  const map = _map ?? (view?.presentation.target as Map.Map | undefined);

  const typename = view?.query ? typenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(client, space, typename);
  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());

  const markers = objects
    .map((row) => {
      if (!view?.projection.pivotFieldId) {
        return undefined;
      }

      const field = view.projection.fields?.find((f) => f.id === view.projection.pivotFieldId);
      const geopoint = field?.path && getDeep(row, field.path.split('.'));
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

      return { id: row.id, location: { lat, lng } } as GeoMarker;
    })
    .filter(isNotNullable);

  // TODO(burdon): Do something with selected items (ids). (Correlate against `rowsForType`).
  const selected = useSelected(typename, 'multi');

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
