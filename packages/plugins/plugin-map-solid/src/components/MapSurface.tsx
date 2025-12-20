//
// Copyright 2025 DXOS.org
//

import * as Predicate from 'effect/Predicate';
import { customElement, noShadowDOM } from 'solid-element';
import { Show, createMemo, createSignal } from 'solid-js';

import { Filter, Obj } from '@dxos/echo';
import { useObject, useQuery, useSchema } from '@dxos/echo-solid';
import { useRef } from '@dxos/echo-solid';
import { type Map as MapType } from '@dxos/plugin-map/types';
import { getTypenameFromQuery } from '@dxos/schema';
import { type GeoMarker } from '@dxos/solid-ui-geo';
import { getDeep } from '@dxos/util';

import { GlobeControl } from './Globe';
import { MapControl } from './Map';

type MapSurfaceProps = {
  data?: { subject: MapType.Map };
};

const MapSurface = (props: MapSurfaceProps) => {
  noShadowDOM();

  const map = props.data?.subject;
  const viewRef = useObject(map, 'view');
  const view = useRef(viewRef);
  const typename = createMemo(() => {
    const v = view();
    return v?.query ? getTypenameFromQuery(v.query.ast) : undefined;
  });

  const [type, setType] = createSignal<'map' | 'globe'>('map');

  const db = createMemo(() => (map ? Obj.getDatabase(map) : undefined));
  const schema = useSchema(db, typename);
  const filter = createMemo(() => {
    const s = schema();
    return s ? Filter.type(s) : Filter.nothing();
  });
  const objects = useQuery(db, filter);
  const markers = createMemo(() => {
    const v = view();
    const objs = objects();

    if (!v || !objs.length) {
      return [];
    }

    return objs
      .map((row): GeoMarker | undefined => {
        if (!v.projection?.pivotFieldId) {
          return undefined;
        }

        const field = v.projection.fields?.find((f) => f.id === v.projection.pivotFieldId);
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
      .filter(Predicate.isNotNullable);
  });

  return (
    <div class='flex h-full w-full min-h-0'>
      <Show when={type() === 'map'}>
        <div class='flex-1 min-h-0'>
          <MapControl markers={markers} onToggle={() => setType('globe')} />
        </div>
      </Show>
      <Show when={type() === 'globe'}>
        <GlobeControl markers={markers} onToggle={() => setType('map')} />
      </Show>
    </div>
  );
};

customElement(
  'dx-map-surface',
  {
    data: undefined,
  },
  MapSurface,
);
