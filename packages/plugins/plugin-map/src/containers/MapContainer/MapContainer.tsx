//
// Copyright 2023 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import React, { Fragment } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Filter, useQuery, useSchema } from '@dxos/react-client/echo';
import { Flex, type FlexProps, Layout, useControlledState } from '@dxos/react-ui';
import { useSelected } from '@dxos/react-ui-attention';
import { type GeoMarker, type MapRootProps } from '@dxos/react-ui-geo';
import { getTypenameFromQuery } from '@dxos/schema';
import { getDeep } from '@dxos/util';

import { GlobeControl } from '../../components/Globe';
import { MapControl } from '../../components/Map';
import { type GeoControlProps } from '../../components/types';
import { type Map } from '../../types';

export type MapControlType = 'globe' | 'map';

export type MapContainerProps = SurfaceComponentProps<
  Map.Map,
  GeoControlProps & Pick<MapRootProps, 'onChange'> & { type?: MapControlType }
>;

export const MapContainer = ({ role, subject: object, type: typeProp = 'map', ...props }: MapContainerProps) => {
  const [type, setType] = useControlledState(typeProp);
  const db = object && Obj.getDatabase(object);

  const view = object?.view?.target;
  const typename = view?.query ? getTypenameFromQuery(view.query.ast) : undefined;
  const schema = useSchema(db, typename);
  const objects = useQuery(db, schema ? Filter.type(schema) : Filter.nothing());

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
      <Layout.Main>
        {type === 'map' && (
          <MapControl markers={markers} selected={selected} onToggle={() => setType('globe')} {...props} />
        )}
        {type === 'globe' && (
          <GlobeControl markers={markers} selected={selected} onToggle={() => setType('map')} {...props} />
        )}
      </Layout.Main>
    </Root>
  );
};

const Container = (props: FlexProps) => <Flex {...props} classNames='aspect-square' />;
