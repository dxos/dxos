//
// Copyright 2023 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import React, { Fragment, useMemo } from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj, Query } from '@dxos/echo';
import { Filter, useObject, useQuery, useSchema } from '@dxos/react-client/echo';
import { Panel as DxPanel, Flex, type FlexProps, useControlledState } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type GeoMarker, type MapRootProps } from '@dxos/react-ui-geo';
import { getTagFromQuery, getTypenameFromQuery } from '@dxos/schema';
import { getDeep } from '@dxos/util';

import { type GeoControlProps, GlobeControl, MapControl } from '../../components';
import { type Map } from '../../types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = ObjectSurfaceProps<
  Map.Map,
  GeoControlProps & Pick<MapRootProps, 'onChange'> & { type?: MapControlType }
>;

export const MapContainer = ({ role, subject: object, type: typeProp = 'map', ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(typeProp);
  const db = object && Obj.getDatabase(object);

  const [view] = useObject(object?.view);
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;
  const schema = useSchema(db, typename);
  const query = useMemo(() => {
    const baseFilter = schema ? Filter.type(schema) : Filter.nothing();
    return tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter);
  }, [schema, tag]);
  const objects = useQuery(db, query);

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
    .filter(Predicate.isNotNullable);

  const selected = useSelected(typename, 'multi');
  const Root = role === 'section' ? Container : Fragment;

  return (
    <Root>
      <DxPanel.Root>
        <DxPanel.Content>
          {type === 'map' && (
            <MapControl markers={markers} selected={selected} onToggle={() => setType('globe')} {...props} />
          )}
          {type === 'globe' && (
            <GlobeControl markers={markers} selected={selected} onToggle={() => setType('map')} {...props} />
          )}
        </DxPanel.Content>
      </DxPanel.Root>
    </Root>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
