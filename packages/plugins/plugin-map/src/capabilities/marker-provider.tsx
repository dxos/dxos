//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Predicate from 'effect/Predicate';
import { useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { useSchemaFilter } from '@dxos/app-toolkit/ui';
import { Filter, Obj, Query } from '@dxos/echo';
import { useObject, useQuery, useType } from '@dxos/echo-react';
import { DXN } from '@dxos/keys';
import { type GeoMarker } from '@dxos/react-ui-geo';
import { getTagFromQuery, getTypeURIFromQuery } from '@dxos/schema';
import { getDeep } from '@dxos/util';

import { Map, MapCapabilities } from '#types';

/**
 * Reactive markers for a {@link Map.Map}: queries the map's backing view and plots each row at its
 * pivot geolocation field. Selection is multi-mode keyed on the source typename (so a linked table
 * and the map highlight the same rows).
 */
const useViewMarkers = (subject: Map.Map): MapCapabilities.MarkerSet => {
  const db = subject && Obj.getDatabase(subject);
  const [view] = useObject(subject?.view);
  const typeUri = view?.query ? getTypeURIFromQuery(view.query.ast) : undefined;
  const tag = view?.query ? getTagFromQuery(view.query.ast) : undefined;
  const schema = useType(db, typeUri);
  const baseFilter = useSchemaFilter(schema);
  const query = useMemo(
    () => (tag ? Query.select(baseFilter).select(Filter.tag(tag)) : Query.select(baseFilter)),
    [baseFilter, tag],
  );
  const objects = useQuery(db, query);

  const markers = useMemo(
    () =>
      objects
        .map((row): GeoMarker | undefined => {
          if (!view?.projection.pivotFieldId) {
            return undefined;
          }

          const field = view.projection.fields?.find((candidate) => candidate.id === view.projection.pivotFieldId);
          const geopoint = field?.path && getDeep(row, field.path.split('.'));
          if (!geopoint || !Array.isArray(geopoint) || geopoint.length < 2) {
            return undefined;
          }

          const [lng, lat] = geopoint;
          if (typeof lng !== 'number' || typeof lat !== 'number') {
            return undefined;
          }

          return { id: row.id, location: { lat, lng } };
        })
        .filter(Predicate.isNotNullable),
    [objects, view?.projection.pivotFieldId, view?.projection.fields],
  );

  return { markers, selection: typeUri ? { contextId: typeUri, mode: 'multi' } : undefined };
};

/** Built-in provider plotting a {@link Map.Map}'s view rows. */
export const viewMarkerProvider: MapCapabilities.MarkerProvider = {
  id: DXN.make('org.dxos.plugin.map.view').toString(),
  match: (subject) => Obj.instanceOf(Map.Map, subject),
  useMarkers: useViewMarkers,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(MapCapabilities.MarkerProvider, viewMarkerProvider)),
);
